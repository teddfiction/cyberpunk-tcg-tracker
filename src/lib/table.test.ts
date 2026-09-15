/**
 * Tri et filtrage à travers une vraie instance TanStack : c'est le contrat qui
 * compte, pas les fonctions prises isolément.
 */
import { describe, expect, it } from "vitest"

import { HIDDEN_COLUMNS, resolveSorting } from "@/lib/table"
import { makeTable } from "@/test/table"

const idsOf = (mode: "normal" | "foil" | "card", state: Parameters<typeof makeTable>[1]) =>
  makeTable(mode, state)
    .getRowModel()
    .rows.map((r) => r.original.id)

describe("tri", () => {
  it("ordonne les cotes croissantes et repousse les lignes sans prix", () => {
    const ids = idsOf("normal", { sorting: [{ id: "low", desc: false }] })
    expect(ids.slice(0, 3)).toEqual([12, 10, 14])
    expect(new Set(ids.slice(3))).toEqual(new Set([13, 11]))
  })

  it("garde les lignes sans prix en bas même en tri décroissant", () => {
    const ids = idsOf("normal", { sorting: [{ id: "low", desc: true }] })
    expect(ids.slice(0, 3)).toEqual([14, 10, 12])
    expect(new Set(ids.slice(3))).toEqual(new Set([13, 11]))
  })

  it("trie les noms avec la collation française", () => {
    const table = makeTable("normal", { sorting: [{ id: "name", desc: false }] })
    expect(table.getRowModel().rows.map((r) => r.original.name)[1]).toBe("Éclair - Vif")
  })
})

describe("resolveSorting", () => {
  it("conserve un tri dont la colonne existe", () => {
    expect(resolveSorting([{ id: "low", desc: false }], ["name", "low"], "normal")).toEqual([
      { id: "low", desc: false },
    ])
  })

  it("retombe sur le tri par défaut du mode quand la colonne a disparu", () => {
    expect(resolveSorting([{ id: "low", desc: false }], ["name", "lowF"], "foil")).toEqual([
      { id: "lowF", desc: true },
    ])
    expect(resolveSorting([], ["bestLow"], "card")).toEqual([{ id: "bestLow", desc: true }])
  })
})

describe("filtres", () => {
  it("« masquer les lignes sans prix » écarte le produit sans cote", () => {
    expect(new Set(idsOf("normal", { columnFilters: [{ id: "priced", value: true }] }))).toEqual(
      new Set([10, 11, 12, 14])
    )
  })

  it("« coté » veut dire foil en mode foil", () => {
    expect(idsOf("foil", { columnFilters: [{ id: "priced", value: true }] })).toEqual([11])
  })

  it("« singles uniquement » écarte le scellé", () => {
    expect(idsOf("normal", { columnFilters: [{ id: "single", value: true }] })).not.toContain(13)
  })

  it("filtre par extensions, en union", () => {
    expect(new Set(idsOf("normal", { columnFilters: [{ id: "exps", value: ["2"] }] }))).toEqual(
      new Set([11, 12])
    )
    expect(
      new Set(idsOf("normal", { columnFilters: [{ id: "exps", value: ["1", "3"] }] }))
    ).toEqual(new Set([10, 13, 14]))
  })

  it("une extension vide ne filtre rien", () => {
    expect(idsOf("normal", { columnFilters: [{ id: "exps", value: [] }] })).toHaveLength(5)
  })

  it("retient une carte dès qu'une de ses impressions correspond", () => {
    expect(idsOf("card", { columnFilters: [{ id: "exps", value: ["3"] }] })).toHaveLength(1)
  })

  it("cumule les filtres", () => {
    const ids = idsOf("normal", {
      columnFilters: [
        { id: "priced", value: true },
        { id: "single", value: true },
        { id: "exps", value: ["2"] },
      ],
    })
    expect(new Set(ids)).toEqual(new Set([11, 12]))
  })
})

describe("recherche", () => {
  it("cherche dans le nom", () => {
    expect(new Set(idsOf("normal", { globalFilter: "zébu" }))).toEqual(new Set([10, 14]))
  })

  it("cherche dans le code d'impression et l'extension", () => {
    expect(new Set(idsOf("normal", { globalFilter: "A1" }))).toEqual(new Set([10, 13]))
    expect(new Set(idsOf("normal", { globalFilter: "beta kit" }))).toEqual(new Set([11, 12]))
  })

  it("cherche dans l'identifiant produit", () => {
    expect(idsOf("normal", { globalFilter: "12" })).toEqual([12])
  })
})

describe("colonnes masquées", () => {
  it("ne sont ni rendues ni exportées", () => {
    const visible = makeTable("normal").getVisibleLeafColumns().map((c) => c.id)
    for (const id of Object.keys(HIDDEN_COLUMNS)) expect(visible).not.toContain(id)
  })
})
