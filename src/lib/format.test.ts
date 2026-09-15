/** Formatage et normalisation — `norm()` est la clé de jointure entre sources. */
import { describe, expect, it } from "vitest"

import { eur, minOf, norm, pct, words } from "@/lib/format"

describe("norm", () => {
  it("rapproche les deux écritures d'un même nom", () => {
    expect(norm("V - Streetkid")).toBe(norm("V: Streetkid"))
  })

  it("reproduit le set.code renvoyé par Netdeck", () => {
    expect(norm("Welcome to Night City — Retail")).toBe("welcometonightcityretail")
  })

  it("supprime accents et ponctuation", () => {
    expect(norm("Éclair - Vif")).toBe("eclairvif")
  })
})

describe("words", () => {
  it("découpe sur la ponctuation", () => {
    expect(words("V - Corporate Exile")).toEqual(["v", "corporate", "exile"])
  })

  it("retire les accents sans coller les mots", () => {
    expect(words("Éclair - Vif")).toEqual(["eclair", "vif"])
  })

  it("traite les tirets longs comme des séparateurs", () => {
    expect(words("Welcome to Night City — Retail")).toEqual([
      "welcome", "to", "night", "city", "retail",
    ])
  })

  it("rend une liste vide quand il n'y a rien de comparable", () => {
    expect(words("  -  ")).toEqual([])
  })
})

describe("eur", () => {
  it("rend null pour une valeur absente, pas « 0 € »", () => {
    expect(eur(null)).toBeNull()
    expect(eur(undefined)).toBeNull()
  })

  it("formate en virgule décimale", () => {
    expect(eur(12.5)).toContain("12,50")
  })
})

describe("pct", () => {
  it("signe explicitement le positif", () => {
    expect(pct(12.5).startsWith("+")).toBe(true)
    expect(pct(-3).startsWith("+")).toBe(false)
  })
})

describe("minOf", () => {
  it("ignore les valeurs absentes", () => {
    expect(minOf([null, 3, undefined, 1])).toBe(1)
  })

  it("rend null quand tout est absent", () => {
    expect(minOf([null, undefined])).toBeNull()
  })
})
