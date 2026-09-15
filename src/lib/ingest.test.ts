/**
 * Lecture des exports Cardmarket : la garde de schéma, et le champ `dateAdded`
 * que le catalogue porte depuis peu.
 */
import { describe, expect, it } from "vitest"

import { IngestError, expectJson, parse } from "@/lib/ingest"

const catalogue = (extra: object = {}) => ({
  version: 1,
  createdAt: "2026-09-15T12:48:22+0200",
  products: [
    {
      idProduct: 1,
      name: "V - Streetkid",
      idExpansion: 6714,
      idMetacard: 467223,
      categoryName: "Cyberpunk Single",
      dateAdded: "2026-08-28 17:13:28",
    },
  ],
  ...extra,
})

describe("garde de schéma", () => {
  it("accepte la version annoncée par les exports du jour", () => {
    expect(parse(catalogue(), "products.json").kind).toBe("catalog")
  })

  it("refuse une version inattendue plutôt que de lire des champs déplacés", () => {
    expect(() => parse(catalogue({ version: 2 }), "products.json")).toThrow(IngestError)
    expect(() => parse(catalogue({ version: 2 }), "products.json")).toThrow(/version 2, attendu 1/)
  })

  it("laisse passer un export sans version — cards_enriched.json n'en porte pas", () => {
    const sans = catalogue()
    delete (sans as { version?: number }).version
    expect(parse(sans, "products.json").kind).toBe("catalog")
  })
})

describe("dateAdded", () => {
  it("est repris tel quel, en chaîne", () => {
    const parsed = parse(catalogue(), "products.json")
    if (parsed.kind !== "catalog") throw new Error("mauvaise forme")
    expect(parsed.products[0].added).toBe("2026-08-28 17:13:28")
  })

  it("rend une chaîne vide quand Cardmarket ne le donne pas", () => {
    const sans = catalogue()
    delete (sans.products[0] as { dateAdded?: string }).dateAdded
    const parsed = parse(sans, "products.json")
    if (parsed.kind !== "catalog") throw new Error("mauvaise forme")
    expect(parsed.products[0].added).toBe("")
  })

  it("se compare en chaîne : le format à largeur fixe rend l'ordre chronologique", () => {
    expect("2026-08-28 17:13:28" < "2026-09-07 12:30:00").toBe(true)
    expect("2026-09-11 09:02:00" < "2026-09-11 18:45:00").toBe(true)
  })
})

describe("expectJson", () => {
  it("rend l'objet quand c'est du JSON", () => {
    expect(expectJson('{"a":1}', "x.json")).toEqual({ a: 1 })
  })

  it("lève sur du HTML rendu avec un 200 — le piège du relais absent", () => {
    expect(() => expectJson("<!doctype html>", "x.json")).toThrow(IngestError)
    expect(() => expectJson("<!doctype html>", "x.json")).toThrow(/non-JSON/)
  })
})
