/**
 * Collection : quantités, niveaux — jeu de base, toutes les raretés, Masterset —,
 * et ce que les facettes, le sélecteur de possession et les tris en font.
 */
import { describe, expect, it } from "vitest"

import {
  LEVELS,
  LEVEL_IDS,
  MISSING,
  OWNED,
  OWNED_FACET,
  backupName,
  levelStats,
  orphans,
  qtyOf,
  scopeGrid,
  summarize,
  withQty,
} from "@/lib/collection"
import { toCsv } from "@/lib/csv"
import { FACETS, RARITY_FACET, gridRows } from "@/lib/facets"
import { buildGrid, buildPrintings } from "@/lib/printings"
import { SORTS } from "@/lib/sorts"
import { COLLECTION, CODES, EXPANSIONS } from "@/test/fixtures"
import { gridIds, gridNames, gridOf, makeGrid } from "@/test/table"
import type { Collection, EnrichedCard, GridCard } from "@/types"

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

  it("filtre les cartes possédées et manquantes, par la colonne du sélecteur", () => {
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

describe("niveaux", () => {
  const base = gridOf(COLLECTION)
  const tiles = (level: keyof typeof LEVELS) => LEVELS[level].grid(base)
  const ids = (grid: GridCard[]) => grid.map((c) => c.id)
  const missingIds = (grid: GridCard[]) => ids(grid.filter((c) => c.owned === 0))

  it("s'ouvre sur le jeu de base, et monte en exigence", () => {
    expect(LEVEL_IDS).toEqual(["base", "full", "masterset"])
  })

  it("jeu de base : une tuile par carte à collectionner de Common à Secret", () => {
    // La Nova Rare de Zébu n'en fait pas partie.
    expect(ids(tiles("base"))).toEqual(["Éclair - Vif", "Zébu - Calme|Common"])
  })

  it("toutes les raretés : les variantes en plus", () => {
    expect(ids(tiles("full"))).toEqual([
      "Éclair - Vif",
      "Zébu - Calme|Common",
      "Zébu - Calme|Nova Rare",
    ])
  })

  it("Masterset : une tuile par version, identifiée par son uuid", () => {
    expect(ids(tiles("masterset"))).toEqual(["u3", "u1", "u2"])
    const zebu = tiles("masterset").find((c) => c.id === "u2")!
    expect(zebu.printings.map((p) => p.uuid)).toEqual(["u2"])
    expect(zebu.rarities).toEqual(["Common"])
    expect(zebu.sets).toEqual(["Welcome to Night City — Retail"])
  })

  it("s'emboîtent : le jeu de base dans toutes les raretés, chaque version au Masterset", () => {
    const full = new Set(ids(tiles("full")))
    for (const id of ids(tiles("base"))) expect(full).toContain(id)
    const all = base.flatMap((c) => c.printings.map((p) => p.uuid)).sort()
    expect(ids(tiles("masterset")).sort()).toEqual(all)
  })

  it("montre les possédées et les manquantes, à chaque niveau", () => {
    // Zébu n'est possédée qu'en Common : rien ne manque au jeu de base, sa Nova
    // Rare manque aux deux autres niveaux.
    expect(missingIds(tiles("base"))).toEqual([])
    expect(missingIds(tiles("full"))).toEqual(["Zébu - Calme|Nova Rare"])
    expect(missingIds(tiles("masterset"))).toEqual(["u1"])
  })

  it("tient une carte à collectionner pour complète dès qu'une de ses impressions l'est", () => {
    // Une Rare en Retail et en Beta, plus une Iconic Legend : seule la Beta est
    // possédée.
    const print = (uuid: string, set: string, number: string, rarity: string) => ({
      uuid,
      set: `Welcome to Night City — ${set}`,
      setCode: "",
      number,
      rarity,
      artist: null,
    })
    const card: EnrichedCard = {
      name: "Reprise - Test",
      slug: "reprise-test",
      printings: [
        print("r1", "Retail", "042", "Rare"),
        print("r2", "Beta", "β042", "Rare"),
        print("r3", "Beta", "β150", "Iconic Legend"),
      ],
    }
    const collection: Collection = {
      r2: { ...COLLECTION.u3, name: "Reprise - Test", num: "β042", rarity: "Rare" },
    }
    const grid = buildGrid(
      [card],
      buildPrintings({ cards: [card], rows: [], expansions: EXPANSIONS, codes: CODES, collection })
    )
    expect(missingIds(LEVELS.base.grid(grid))).toEqual([])
    expect(missingIds(LEVELS.full.grid(grid))).toEqual(["Reprise - Test|Iconic Legend"])
    // Au Masterset, la Retail manque encore.
    expect(missingIds(LEVELS.masterset.grid(grid))).toEqual(["r1", "r3"])
  })

  it("isole les possédées ou les manquantes, par le sélecteur", () => {
    const only = (level: keyof typeof LEVELS, value: string) =>
      gridIds(makeGrid({ columnFilters: [{ id: OWNED_FACET, value: [value] }] }, tiles(level)))
    expect(only("base", MISSING)).toEqual([])
    expect(only("full", MISSING)).toEqual(["Zébu - Calme|Nova Rare"])
    expect(only("masterset", MISSING)).toEqual(["u1"])
    expect(only("full", OWNED)).toEqual(["Éclair - Vif", "Zébu - Calme|Common"])
    expect(only("masterset", OWNED)).toEqual(["u3", "u2"])
  })

  it("ne remonte pas une rareté que la carte a mais qu'on ne possède pas", () => {
    const filter = [
      { id: RARITY_FACET, value: ["Nova Rare"] },
      { id: OWNED_FACET, value: [OWNED] },
    ]
    expect(gridNames(makeGrid({ columnFilters: filter }, tiles("masterset")))).toEqual([])
    expect(gridNames(makeGrid({ columnFilters: filter }, tiles("full")))).toEqual([])
  })

  it("ne redécline pas ses tuiles quand une rareté est cochée", () => {
    const rare = [{ id: RARITY_FACET, value: ["Common"] }]
    for (const level of LEVEL_IDS) expect(gridRows(tiles(level), rare)).toEqual(tiles(level))
  })

  it("sert chaque périmètre depuis la même base", () => {
    expect(scopeGrid("all", base)).toBe(base)
    for (const level of LEVEL_IDS) expect(scopeGrid(level, base)).toEqual(tiles(level))
  })

  it("n'est pas une facette de la base de cartes", () => {
    expect(FACETS.map((f) => f.id)).not.toContain(OWNED_FACET)
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
  it("mesure la complétion de chaque niveau sur toutes ses tuiles", () => {
    const base = gridOf(COLLECTION)
    const of = (level: keyof typeof LEVELS, grid = base) => levelStats(LEVELS[level].grid(grid))
    expect(of("base")).toEqual({ owned: 2, missing: 0, total: 2, copies: 4 })
    expect(of("full")).toEqual({ owned: 2, missing: 1, total: 3, copies: 4 })
    expect(of("masterset")).toEqual({ owned: 2, missing: 1, total: 3, copies: 4 })
    expect(of("base", gridOf())).toEqual({ owned: 0, missing: 2, total: 2, copies: 0 })
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
