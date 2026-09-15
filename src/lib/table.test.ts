/**
 * Tri et filtrage à travers une vraie instance TanStack : c'est le contrat qui
 * compte, pas les fonctions prises isolément.
 */
import { describe, expect, it } from "vitest"

import { columnsFor } from "@/components/columns"
import { MODES, MODE_IDS } from "@/lib/modes"
import { HIDDEN_COLUMNS, resolveSorting } from "@/lib/table"
import { makeTable, namesOf } from "@/test/table"

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
    const fallback = [{ id: "low", desc: true }]
    expect(resolveSorting([{ id: "low", desc: false }], ["name", "low"], fallback)).toEqual([
      { id: "low", desc: false },
    ])
  })

  it("retombe sur le tri par défaut quand la colonne a disparu", () => {
    expect(
      resolveSorting([{ id: "low", desc: false }], ["name", "lowF"], [{ id: "lowF", desc: true }])
    ).toEqual([{ id: "lowF", desc: true }])
    expect(resolveSorting([], ["bestLow"], [{ id: "bestLow", desc: true }])).toEqual([
      { id: "bestLow", desc: true },
    ])

    // Un repli à plusieurs clés passe entier : c'est ce dont vit le tri par
    // défaut de la grille.
    const grid = [
      { id: "color", desc: false },
      { id: "type", desc: false },
    ]
    expect(resolveSorting([{ id: "disparue", desc: false }], ["color", "type"], grid)).toEqual(grid)
  })

  it("chaque mode apporte son tri par défaut", () => {
    for (const mode of MODE_IDS) {
      const columns = columnsFor(mode, false).map((c) => c.id)
      expect(columns).toContain(MODES[mode].defaultSort)
    }
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
  it("ignore les accents, dans les deux sens", () => {
    expect(new Set(idsOf("normal", { globalFilter: "zebu" }))).toEqual(new Set([10, 14]))
    expect(new Set(idsOf("normal", { globalFilter: "ZÉBU" }))).toEqual(new Set([10, 14]))
  })

  it("franchit la ponctuation du nom", () => {
    // « Zébu - Calme » : le tiret ne doit pas couper la recherche en deux.
    expect(new Set(idsOf("normal", { globalFilter: "zebu calme" }))).toEqual(new Set([10, 14]))
  })

  it("se contente d'un début de mot", () => {
    expect(new Set(idsOf("normal", { globalFilter: "zeb cal" }))).toEqual(new Set([10, 14]))
  })

  it("accepte les mots dans n'importe quel ordre", () => {
    expect(new Set(idsOf("normal", { globalFilter: "calme zebu" }))).toEqual(new Set([10, 14]))
    expect(idsOf("normal", { globalFilter: "retail welcome" })).toEqual([14])
  })

  it("exige que tous les mots correspondent", () => {
    expect(idsOf("normal", { globalFilter: "zebu deluxe" })).toEqual([])
  })

  it("ne s'apparie ni à cheval sur deux mots, ni au milieu d'un mot", () => {
    // Les deux garde-fous contre les faux positifs : « vif » et « beta » se
    // suivent dans la ligne mais « vifbeta » n'est pas un mot, et « alme » est
    // bien dans « calme » sans en être le début.
    expect(idsOf("normal", { globalFilter: "vifbeta" })).toEqual([])
    expect(idsOf("normal", { globalFilter: "alme" })).toEqual([])
  })

  it("trouve un nom d'une lettre sans ramener tout ce qui contient cette lettre", () => {
    // « Vif » commence par v ; « Zébu » et « Effet » n'ont pas de mot en v.
    expect(idsOf("normal", { globalFilter: "v" })).toEqual([11])
  })

  it("une requête sans rien de comparable ne filtre pas", () => {
    expect(idsOf("normal", { globalFilter: " - " })).toHaveLength(5)
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

describe("colonne Ajouté le", () => {
  it("range du plus récent au plus ancien, sans retomber sur le nom", () => {
    // La fixture est volontairement désordonnée : l'ordre des noms et celui du
    // tableau donneraient tous deux un autre résultat.
    expect(namesOf(makeTable("normal", { sorting: [{ id: "added", desc: true }] }))[0]).toBe(
      "Zébu - Calme"
    )
    expect(namesOf(makeTable("normal", { sorting: [{ id: "added", desc: false }] }))[0]).toBe(
      "Effet - Net"
    )
  })
})
