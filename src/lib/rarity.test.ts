/**
 * Rareté : elle n'est affichée que lorsqu'elle est certaine. Le reste du temps
 * on montre les candidates — jamais l'une d'elles choisie au hasard.
 */
import { describe, expect, it } from "vitest"

import { RARITIES, rarityLabel, rarityRank } from "@/data/rarities"
import { buildRows } from "@/lib/dataset"
import { buildEnrichIndex } from "@/lib/enrich"
import { makeTable } from "@/test/table"
import {
  AMBIGUOUS_CATALOG,
  AMBIGUOUS_ENRICHED,
  CATALOG,
  CODES,
  ENRICHED,
  EXPANSIONS,
  PRICES,
} from "@/test/fixtures"

describe("taxonomie", () => {
  it("classe de la plus commune à la plus rare", () => {
    expect(rarityRank("Common")).toBeLessThan(rarityRank("Epic"))
    expect(rarityRank("Epic")).toBeLessThan(rarityRank("Nova Rare"))
    expect(rarityRank("Nova Rare")).toBeLessThan(rarityRank("Secret"))
  })

  it("tolère la casse et la ponctuation de Netdeck", () => {
    expect(rarityLabel("ICONIC_LEGEND")).toBe("Iconic Legend")
    expect(rarityLabel("iconic secret")).toBe("Iconic Secret")
    expect(rarityRank("nova-rare")).toBe(rarityRank("Nova Rare"))
  })

  it("laisse passer une rareté inconnue, rangée après les connues", () => {
    expect(rarityLabel("Promo Kiosque")).toBe("Promo Kiosque")
    expect(rarityRank("Promo Kiosque")).toBe(RARITIES.length)
  })
})

const rowsOf = (catalog: typeof CATALOG, enriched: typeof ENRICHED) =>
  buildRows({
    catalog,
    prices: PRICES,
    expansions: EXPANSIONS,
    codes: CODES,
    enrich: buildEnrichIndex(enriched, EXPANSIONS),
  })

describe("appariement certain", () => {
  const rows = rowsOf(CATALOG, ENRICHED)
  const byId = (id: number) => rows.find((r) => r.id === id)!

  it("donne la rareté et le numéro quand un produit fait face à une impression", () => {
    expect(byId(10).rarity).toBe("Nova Rare")
    expect(byId(10).num).toBe("001")
    expect(byId(10).rarities).toEqual([])
  })

  it("distingue les deux impressions d'une réimpression entre extensions", () => {
    expect(byId(10).uuid).toBe("u1")
    expect(byId(14).uuid).toBe("u2")
  })

  it("laisse tout vide quand Netdeck ne connaît pas le produit", () => {
    expect(byId(13).rarity).toBeNull()
    expect(byId(13).rarities).toEqual([])
  })
})

describe("plusieurs produits Cardmarket, une seule impression connue", () => {
  // Une seule impression connue : sa rareté vaut pour chaque produit, sans
  // ambiguïté. Les 37 doublons réels du catalogue divergent plutôt en rareté —
  // c'est le cas « appariement ambigu », plus bas.
  const rows = rowsOf(AMBIGUOUS_CATALOG, AMBIGUOUS_ENRICHED)
  const byId = (id: number) => rows.find((r) => r.id === id)!

  it("affiche la rareté de la carte sur chaque version", () => {
    expect(byId(23).rarity).toBe("Secret")
    expect(byId(24).rarity).toBe("Secret")
    expect(byId(23).rarities).toEqual([])
  })

  it("donne aussi le numéro de collecteur, qui est celui de la carte", () => {
    expect(byId(23).num).toBe("012")
  })

  it("signale combien de versions Cardmarket partagent ce nom", () => {
    expect(byId(23).variants).toBe(2)
    expect(byId(22).variants).toBe(1)
  })
})

describe("appariement ambigu", () => {
  const rows = rowsOf(AMBIGUOUS_CATALOG, AMBIGUOUS_ENRICHED)
  const byId = (id: number) => rows.find((r) => r.id === id)!

  it("n'attribue aucune rareté quand les impressions connues divergent", () => {
    expect(byId(20).rarity).toBeNull()
    expect(byId(21).rarity).toBeNull()
  })

  it("expose les raretés possibles, sans en choisir une", () => {
    expect(byId(20).rarities).toEqual(["Rare", "Nova Rare"])
    expect(byId(21).rarities).toEqual(["Rare", "Nova Rare"])
  })

  it("ne prête pas de numéro de collecteur : il désigne une impression", () => {
    expect(byId(20).num).toBeNull()
    expect(byId(20).uuid).toBeNull()
  })

  it("garde le slug, qui identifie la carte et non l'impression", () => {
    expect(byId(20).slug).toBe("double-face")
  })

  it("reste exact pour la carte sans variante de la même extension", () => {
    expect(byId(22).rarity).toBe("Epic")
    expect(byId(22).rarities).toEqual([])
  })
})

describe("colonne Rareté", () => {
  it("trie par rang et non par ordre alphabétique", () => {
    // Common < Epic < Nova Rare. En alphabétique, Epic passerait en premier.
    const table = makeTable("normal", { sorting: [{ id: "rarity", desc: false }] }, true)
    const ids = table.getRowModel().rows.map((r) => r.original.id)
    expect(ids.slice(0, 3)).toEqual([14, 11, 10])
  })

  it("range les produits sans rareté en bas, dans les deux sens", () => {
    for (const desc of [false, true]) {
      const table = makeTable("normal", { sorting: [{ id: "rarity", desc }] }, true)
      const ids = table.getRowModel().rows.map((r) => r.original.id)
      expect(new Set(ids.slice(3))).toEqual(new Set([12, 13]))
    }
  })

  it("n'apparaît pas tant que l'enrichissement n'est pas chargé", () => {
    const ids = makeTable("normal").getVisibleLeafColumns().map((c) => c.id)
    expect(ids).not.toContain("rarity")
    expect(makeTable("normal", {}, true).getVisibleLeafColumns().map((c) => c.id)).toContain(
      "rarity"
    )
  })
})

describe("colonne Visuel", () => {
  it("n'apparaît qu'une fois l'enrichissement chargé, et en tête", () => {
    expect(makeTable("normal").getVisibleLeafColumns().map((c) => c.id)).not.toContain("thumb")
    expect(makeTable("normal", {}, true).getVisibleLeafColumns()[0].id).toBe("thumb")
  })

  it("laisse la recherche sur la colonne Produit, qui n'est plus la première", () => {
    const table = makeTable("normal", { globalFilter: "zebu" }, true)
    expect(table.getRowModel().rows.map((r) => r.original.id).sort()).toEqual([10, 14])
  })
})
