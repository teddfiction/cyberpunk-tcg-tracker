/**
 * Base de cartes : une ligne par impression, et la cote Cardmarket rattachée
 * seulement quand elle est attribuable.
 */
import { describe, expect, it } from "vitest"
import type { Row as TanstackRow } from "@tanstack/react-table"

import { buildRows } from "@/lib/dataset"
import { emptyIndex } from "@/lib/enrich"
import { buildPrintings, printingId, searchPrinting } from "@/lib/printings"
import {
  AMBIGUOUS_CATALOG,
  AMBIGUOUS_ENRICHED,
  CATALOG,
  CODES,
  ENRICHED,
  EXPANSIONS,
  PRICES,
} from "@/test/fixtures"
import type { EnrichedCard, PrintRow, Product } from "@/types"

const build = (catalog: Product[], cards: EnrichedCard[]) =>
  buildPrintings({
    cards,
    rows: buildRows({
      catalog,
      prices: PRICES,
      expansions: EXPANSIONS,
      codes: CODES,
      enrich: emptyIndex(),
    }),
    expansions: EXPANSIONS,
    codes: CODES,
  })

describe("buildPrintings", () => {
  const printings = build(CATALOG, ENRICHED)
  const byUuid = (uuid: string) => printings.find((p) => p.uuid === uuid)!

  it("rend une ligne par impression, pas par produit", () => {
    expect(printings).toHaveLength(3)
    expect(printings.map((p) => p.uuid).sort()).toEqual(["u1", "u2", "u3"])
  })

  it("porte la rareté et le numéro de son impression, sans ambiguïté", () => {
    expect(byUuid("u1").rarity).toBe("Nova Rare")
    expect(byUuid("u2").rarity).toBe("Common")
    expect(byUuid("u1").num).toBe("001")
  })

  it("garde le nom de set officiel, même hors Cardmarket", () => {
    expect(byUuid("u2").set).toBe("Welcome to Night City — Retail")
    expect(byUuid("u2").exp).toBe("3")
  })

  it("rattache la cote quand un seul produit correspond", () => {
    expect(byUuid("u1").low).toBe(8)
    expect(byUuid("u2").low).toBe(15)
    expect(byUuid("u1").lowRange).toBeNull()
    expect(byUuid("u1").variants).toBe(1)
  })

  it("laisse la cote vide quand le produit correspondant n'en a pas", () => {
    expect(byUuid("u3").low).toBeNull()
    expect(byUuid("u3").lowRange).toBeNull()
  })

  it("trie par nom puis par set", () => {
    expect(printings.map((p) => p.name)).toEqual([
      "Éclair - Vif",
      "Zébu - Calme",
      "Zébu - Calme",
    ])
  })

  it("rend une liste vide sans enrichissement", () => {
    expect(buildPrintings({ cards: null, rows: [], expansions: EXPANSIONS, codes: CODES })).toEqual(
      []
    )
  })
})

describe("cote non attribuable", () => {
  const printings = build(AMBIGUOUS_CATALOG, AMBIGUOUS_ENRICHED)
  const byUuid = (uuid: string) => printings.find((p) => p.uuid === uuid)!

  it("montre la fourchette plutôt que d'élire un produit", () => {
    // Deux produits Cardmarket à 5 € et 30 € pour deux impressions : rien ne
    // dit laquelle est laquelle.
    expect(byUuid("d1").low).toBeNull()
    expect(byUuid("d1").lowRange).toEqual([5, 30])
    expect(byUuid("d1").variants).toBe(2)
  })

  it("s'applique aussi à une impression unique face à plusieurs produits", () => {
    expect(byUuid("j1").lowRange).toEqual([7, 9])
  })

  it("reste exacte quand un seul produit correspond", () => {
    expect(byUuid("u9").low).toBe(12)
    expect(byUuid("u9").lowRange).toBeNull()
  })
})

describe("searchPrinting", () => {
  const printings = build(CATALOG, ENRICHED)
  const find = (q: string) =>
    printings
      .filter((p) => searchPrinting({ original: p } as TanstackRow<PrintRow>, "name", q, () => {}))
      .map((p) => p.uuid)

  it("cherche sans accents ni ponctuation", () => {
    expect(find("zebu calme").sort()).toEqual(["u1", "u2"])
  })

  it("cherche dans le set, la rareté et l'artiste", () => {
    expect(find("night city")).toEqual(["u2"])
    expect(find("nova")).toEqual(["u1"])
  })

  it("exige tous les mots", () => {
    expect(find("zebu introuvable")).toEqual([])
  })
})

describe("printingId", () => {
  it("prend l'uuid, unique sur toutes les impressions", () => {
    expect(printingId({ uuid: "abc" } as PrintRow)).toBe("abc")
  })
})
