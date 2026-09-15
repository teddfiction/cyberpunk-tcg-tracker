/**
 * Jointure Netdeck ↔ Cardmarket. Le repli sur le nom seul est le point sensible :
 * l'assouplir attribuerait le mauvais numéro de collecteur aux réimpressions.
 */
import { describe, expect, it } from "vitest"

import { buildEnrichIndex, lookup, matchExpansion } from "@/lib/enrich"
import { ENRICHED, EXPANSIONS } from "@/test/fixtures"

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

describe("lookup", () => {
  it("apparie nom + extension", () => {
    expect(lookup(index, "Zébu - Calme", 1)?.uuid).toBe("u1")
    expect(lookup(index, "Zébu - Calme", 3)?.uuid).toBe("u2")
  })

  it("replie sur le nom seul quand la carte n'a qu'une impression", () => {
    expect(lookup(index, "Éclair - Vif", 999)?.uuid).toBe("u3")
  })

  it("refuse de replier quand la carte a plusieurs impressions", () => {
    expect(lookup(index, "Zébu - Calme", 999)).toBeNull()
  })

  it("index vide : aucune correspondance", () => {
    expect(buildEnrichIndex(null, EXPANSIONS).on).toBe(false)
  })
})
