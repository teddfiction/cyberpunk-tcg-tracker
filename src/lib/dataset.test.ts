/** Construction des lignes et regroupement par carte. */
import { describe, expect, it } from "vitest"

import { buildCards, buildRows, countByExpansion } from "@/lib/dataset"
import { emptyIndex } from "@/lib/enrich"
import { CATALOG, CODES, EXPANSIONS, PRICES } from "@/test/fixtures"

const rows = buildRows({
  catalog: CATALOG,
  prices: PRICES,
  expansions: EXPANSIONS,
  codes: CODES,
  enrich: emptyIndex(),
})

const byId = (id: number) => rows.find((r) => r.id === id)!

describe("buildRows", () => {
  it("trie par nom avec la collation française", () => {
    expect(rows.map((r) => r.name)).toEqual([
      "Booster Box",
      "Éclair - Vif",
      "Effet - Net",
      "Zébu - Calme",
      "Zébu - Calme",
    ])
  })

  it("calcule l'écart tendance / mini", () => {
    expect(byId(10).d).toBeCloseTo(12.5)
  })

  it("calcule l'écart foil moyenne / mini", () => {
    expect(byId(11).df).toBeCloseTo(100)
  })

  it("laisse l'écart nul quand une des deux cotes manque", () => {
    expect(byId(11).d).toBeNull()
    expect(byId(13).d).toBeNull()
  })

  it("distingue coté, coté foil et scellé", () => {
    expect(byId(13).hasPrice).toBe(false)
    expect(byId(13).single).toBe(false)
    expect(byId(11).hasPriceF).toBe(true)
    expect(byId(10).hasPriceF).toBe(false)
  })

  it("reporte le code d'impression de l'extension", () => {
    expect(byId(10).code).toBe("A1")
  })
})

describe("buildCards", () => {
  const cards = buildCards(rows, EXPANSIONS, CODES)

  it("écarte le scellé, qui n'a pas d'idMetacard", () => {
    expect(cards).toHaveLength(3)
  })

  it("regroupe les impressions d'une même carte", () => {
    const zebu = cards.find((c) => c.mc === 100)!
    expect(zebu.nExp).toBe(2)
    expect(zebu.exps.sort()).toEqual([1, 3])
  })

  it("retient la plus petite cote toutes impressions confondues", () => {
    expect(cards.find((c) => c.mc === 100)!.bestLow).toBe(8)
  })

  it("trie par nom, comme les produits", () => {
    expect(cards.map((c) => c.name)).toEqual(["Éclair - Vif", "Effet - Net", "Zébu - Calme"])
  })
})

describe("countByExpansion", () => {
  it("compte les produits par extension", () => {
    expect(countByExpansion(rows)).toEqual({ "1": 2, "2": 2, "3": 1 })
  })
})
