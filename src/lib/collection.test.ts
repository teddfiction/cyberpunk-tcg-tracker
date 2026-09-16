/**
 * Collection : quantités, grille par version, et ce que les facettes et tris de
 * la base de cartes en font.
 */
import { describe, expect, it } from "vitest"

import {
  MISSING,
  OWNED,
  OWNED_FACET,
  SCOPE_GRID,
  backupName,
  collectionStats,
  missingGrid,
  orphans,
  ownedGrid,
  qtyOf,
  summarize,
  withQty,
} from "@/lib/collection"
import { toCsv } from "@/lib/csv"
import { SORTS } from "@/lib/sorts"
import { COLLECTION, CODES } from "@/test/fixtures"
import { gridNames, gridOf, makeGrid } from "@/test/table"
import type { Collection } from "@/types"

const zebuNova = gridOf().find((c) => c.name === "Zébu - Calme")!.printings[0]

describe("withQty", () => {
  it("crée l'entrée avec l'instantané de l'impression", () => {
    const next = withQty({}, zebuNova, 2, "2026-09-16T08:00:00.000Z")
    expect(next.u1).toEqual({
      qty: 2,
      addedAt: "2026-09-16T08:00:00.000Z",
      name: "Zébu - Calme",
      set: "Alpha Kit",
      num: "001",
      rarity: "Nova Rare",
    })
  })

  it("garde la date du premier ajout quand la quantité change", () => {
    const first = withQty({}, zebuNova, 1, "2026-09-16T08:00:00.000Z")
    const next = withQty(first, zebuNova, 4, "2026-09-17T08:00:00.000Z")
    expect(next.u1.qty).toBe(4)
    expect(next.u1.addedAt).toBe("2026-09-16T08:00:00.000Z")
  })

  it("retire l'entrée à zéro, sans toucher aux autres", () => {
    const next = withQty({ ...COLLECTION, ...withQty({}, zebuNova, 1) }, zebuNova, 0)
    expect(Object.keys(next).sort()).toEqual(["u2", "u3"])
  })

  it("rend la même référence quand rien ne change", () => {
    expect(withQty(COLLECTION, zebuNova, 0)).toBe(COLLECTION)
    expect(withQty(COLLECTION, zebuNova, Number.NaN)).toBe(COLLECTION)
    const u2 = gridOf().flatMap((c) => c.printings).find((p) => p.uuid === "u2")!
    expect(withQty(COLLECTION, u2, 3)).toBe(COLLECTION)
  })

  it("lit zéro pour une impression absente", () => {
    expect(qtyOf(COLLECTION, "u2")).toBe(3)
    expect(qtyOf(COLLECTION, "u1")).toBe(0)
  })
})

describe("quantités dans la base de cartes", () => {
  it("porte la quantité par impression, et leur somme par carte", () => {
    const grid = gridOf(COLLECTION)
    const zebu = grid.find((c) => c.name === "Zébu - Calme")!
    expect(zebu.printings.map((p) => [p.uuid, p.qty])).toEqual([
      ["u1", 0],
      ["u2", 3],
    ])
    expect(zebu.owned).toBe(3)
    expect(zebu.id).toBe("Zébu - Calme")
  })

  it("filtre les cartes possédées et manquantes", () => {
    const grid = gridOf({ u3: COLLECTION.u3 })
    const on = (value: string) =>
      gridNames(makeGrid({ columnFilters: [{ id: OWNED_FACET, value: [value] }] }, grid))
    expect(on(OWNED)).toEqual(["Éclair - Vif"])
    expect(on(MISSING)).toEqual(["Zébu - Calme"])
  })

  it("trie par exemplaires décroissants, pas par nom", () => {
    const table = makeGrid({ sorting: [...SORTS.qty.sorting] }, gridOf(COLLECTION))
    expect(gridNames(table)).toEqual(["Zébu - Calme", "Éclair - Vif"])
  })

  it("exporte le nombre d'exemplaires, pas le libellé du filtre", () => {
    const csv = toCsv(makeGrid({}, gridOf(COLLECTION)), CODES)
    const header = csv.split("\n")[0]
    expect(header).toContain('"Exemplaires"')
    expect(header).not.toContain('"Collection"')
  })
})

describe("ownedGrid", () => {
  const owned = ownedGrid(gridOf(COLLECTION))

  it("rend une tuile par version possédée, identifiée par son uuid", () => {
    expect(owned.map((c) => c.id)).toEqual(["u3", "u2"])
    expect(owned.map((c) => c.owned)).toEqual([1, 3])
  })

  it("ne porte que les facettes de sa version", () => {
    const zebu = owned.find((c) => c.id === "u2")!
    expect(zebu.printings.map((p) => p.uuid)).toEqual(["u2"])
    expect(zebu.rarities).toEqual(["Common"])
    expect(zebu.sets).toEqual(["Welcome to Night City — Retail"])
  })

  it("rend une tuile par version quand la carte est possédée deux fois", () => {
    const both = ownedGrid(gridOf({ ...COLLECTION, ...withQty({}, zebuNova, 1) }))
    expect(both.filter((c) => c.name === "Zébu - Calme").map((c) => c.id)).toEqual(["u1", "u2"])
  })

  it("ne remonte pas une rareté que la carte a mais qu'on ne possède pas", () => {
    const filter = { columnFilters: [{ id: "rarities", value: ["Nova Rare"] }] }
    // La base garde Zébu, qui existe en Nova Rare…
    expect(gridNames(makeGrid(filter, gridOf(COLLECTION)))).toEqual(["Zébu - Calme"])
    // … la collection non : seule sa Common est possédée.
    expect(gridNames(makeGrid(filter, owned))).toEqual([])
  })

  it("rend une grille vide sans collection", () => {
    expect(ownedGrid(gridOf())).toEqual([])
  })
})

describe("missingGrid", () => {
  const base = gridOf(COLLECTION)
  const missing = missingGrid(base)

  it("rend une tuile par version absente de la collection", () => {
    // Zébu est possédée en Common (u2) mais pas en Nova Rare (u1) : sa Nova
    // Rare manque, même si la carte, elle, figure dans la collection.
    expect(missing.map((c) => c.id)).toEqual(["u1"])
    expect(missing[0].owned).toBe(0)
    expect(missing[0].rarities).toEqual(["Nova Rare"])
  })

  it("complète exactement la collection, sans doublon ni perte", () => {
    const all = base.flatMap((c) => c.printings.map((p) => p.uuid)).sort()
    const split = [...ownedGrid(base), ...missing].map((c) => c.id).sort()
    expect(split).toEqual(all)
  })

  it("remonte la rareté qui manque, pas celle qu'on possède", () => {
    // Le miroir du test de `ownedGrid` : la Nova Rare de Zébu est ici, la
    // Common non.
    const on = (rarity: string) =>
      gridNames(makeGrid({ columnFilters: [{ id: "rarities", value: [rarity] }] }, missing))
    expect(on("Nova Rare")).toEqual(["Zébu - Calme"])
    expect(on("Common")).toEqual([])
  })

  it("rend toute la base, version par version, sans collection", () => {
    expect(missingGrid(gridOf()).map((c) => c.id)).toEqual(["u3", "u1", "u2"])
  })

  it("sert chaque périmètre depuis la même base", () => {
    expect(SCOPE_GRID.all(base)).toBe(base)
    expect(SCOPE_GRID.owned(base)).toEqual(ownedGrid(base))
    expect(SCOPE_GRID.missing(base)).toEqual(missing)
  })
})

describe("entrées orphelines", () => {
  it("liste les uuids absents de la base, nommés par leur instantané", () => {
    const ghost: Collection = {
      ...COLLECTION,
      zz: { ...COLLECTION.u3, name: "Fantôme - Perdu", set: "Promo" },
    }
    expect(orphans(ghost, gridOf(ghost)).map((o) => [o.uuid, o.name])).toEqual([
      ["zz", "Fantôme - Perdu"],
    ])
  })

  it("considère tout orphelin quand la base n'est pas importée", () => {
    expect(orphans(COLLECTION, [])).toHaveLength(2)
  })
})

describe("statistiques", () => {
  // Forme vérifiée explicitement : un changement de forme passerait le typecheck
  // s'il garde les mêmes méthodes (CLAUDE.md § Tests).
  it("mesure la complétion sur la base entière", () => {
    expect(collectionStats(gridOf(COLLECTION))).toEqual({
      cards: 2,
      totalCards: 2,
      versions: 2,
      totalVersions: 3,
      copies: 4,
    })
  })

  it("résume la collection sans la base", () => {
    expect(summarize(COLLECTION)).toEqual({ versions: 2, copies: 4 })
    expect(summarize({})).toEqual({ versions: 0, copies: 0 })
  })

  it("date le fichier de sauvegarde", () => {
    expect(backupName(new Date("2026-09-16T12:00:00Z"))).toBe(
      "cyberpunk-tcg-collection-2026-09-16.json"
    )
  })
})
