/**
 * Jointure Netdeck ↔ Cardmarket. Le repli sur le nom seul est le point sensible :
 * l'assouplir attribuerait le mauvais numéro de collecteur aux réimpressions.
 */
import { describe, expect, it } from "vitest"

import { buildEnrichIndex, matchExpansion, printingsFor } from "@/lib/enrich"
import { AMBIGUOUS_ENRICHED, ENRICHED, EXPANSIONS } from "@/test/fixtures"

const index = buildEnrichIndex(ENRICHED, EXPANSIONS)

describe("matchExpansion", () => {
  it("apparie sur le set.code", () => {
    expect(matchExpansion("Beta Kit", "betakit", EXPANSIONS)).toBe("2")
  })

  it("apparie un libellé partiel par préfixe", () => {
    expect(matchExpansion("Welcome to Night City", null, EXPANSIONS)).toBe("3")
  })

  it("garde le libellé le plus long en cas d'ambiguïté", () => {
    const ambigu = { ...EXPANSIONS, "4": "Beta Kit Deluxe" }
    expect(matchExpansion("Beta Kit", "betakit", ambigu)).toBe("4")
  })

  it("rend null sans rien d'exploitable", () => {
    expect(matchExpansion(null, null, EXPANSIONS)).toBeNull()
  })
})

describe("printingsFor", () => {
  const uuids = (name: string, exp: number) => printingsFor(index, name, exp).map((p) => p.uuid)

  it("apparie nom + extension", () => {
    expect(uuids("Zébu - Calme", 1)).toEqual(["u1"])
    expect(uuids("Zébu - Calme", 3)).toEqual(["u2"])
  })

  it("replie sur le nom seul quand la carte n'a qu'une impression", () => {
    expect(uuids("Éclair - Vif", 999)).toEqual(["u3"])
  })

  it("refuse de replier quand la carte a plusieurs impressions", () => {
    expect(uuids("Zébu - Calme", 999)).toEqual([])
  })

  it("conserve toutes les impressions d'une même extension", () => {
    const ambigu = buildEnrichIndex(AMBIGUOUS_ENRICHED, EXPANSIONS)
    expect(printingsFor(ambigu, "Double - Face", 1).map((p) => p.rarity)).toEqual([
      "Rare",
      "Nova Rare",
    ])
  })

  it("index vide : aucune correspondance", () => {
    expect(buildEnrichIndex(null, EXPANSIONS).on).toBe(false)
  })
})
