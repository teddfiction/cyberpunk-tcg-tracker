/** Formatage et normalisation — `norm()` est la clé de jointure entre sources. */
import { describe, expect, it } from "vitest"

import { eur, minOf, norm, pct, plural, sentences, words } from "@/lib/format"

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

describe("plural", () => {
  it("n'accorde qu'au-delà de un, zéro compris au singulier", () => {
    expect(plural(0, "version")).toBe("0 version")
    expect(plural(1, "version")).toBe("1 version")
    expect(plural(3, "exemplaire")).toBe("3 exemplaires")
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

describe("sentences", () => {
  it("coupe entre deux phrases", () => {
    expect(sentences("Une phrase. Une autre.")).toEqual(["Une phrase.", "Une autre."])
  })

  it("ne coupe pas dans un nom de fichier", () => {
    // Le vrai compte rendu d'un import de price guide : le point de « .json »
    // est suivi d'une parenthèse, pas d'une majuscule.
    expect(
      sentences(
        "317 lignes de prix depuis price_guide_23.json (export du 15 septembre 2026). 2 produit(s) sans cote."
      )
    ).toEqual([
      "317 lignes de prix depuis price_guide_23.json (export du 15 septembre 2026).",
      "2 produit(s) sans cote.",
    ])
  })

  it("laisse entier un nom de fichier suivi de deux-points", () => {
    expect(
      sentences("151 cartes enrichies depuis cards_enriched.json : 502 impressions.")
    ).toHaveLength(1)
  })

  it("coupe devant un chiffre comme devant une majuscule", () => {
    expect(sentences("Catalogue à jour. 296 produits mis à jour.")).toHaveLength(2)
  })

  it("coupe devant un accent majuscule", () => {
    expect(sentences("Import partiel. État conservé.")).toEqual([
      "Import partiel.",
      "État conservé.",
    ])
  })

  it("rend une liste vide sur une chaîne vide", () => {
    expect(sentences("   ")).toEqual([])
  })
})
