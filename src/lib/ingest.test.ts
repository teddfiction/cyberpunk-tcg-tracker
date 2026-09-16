/**
 * Lecture des exports Cardmarket : la garde de schéma, et le champ `dateAdded`
 * que le catalogue porte depuis peu. Puis les sauvegardes de collection, et le
 * registre des formats que la modale d'import annonce.
 */
import { describe as group, expect, it } from "vitest"

import { IMPORT_FORMATS, IngestError, describe, expectJson, parse, toBackup } from "@/lib/ingest"
import { COLLECTION } from "@/test/fixtures"

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

group("garde de schéma", () => {
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

group("dateAdded", () => {
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

group("expectJson", () => {
  it("rend l'objet quand c'est du JSON", () => {
    expect(expectJson('{"a":1}', "x.json")).toEqual({ a: 1 })
  })

  it("lève sur du HTML rendu avec un 200 — le piège du relais absent", () => {
    expect(() => expectJson("<!doctype html>", "x.json")).toThrow(IngestError)
    expect(() => expectJson("<!doctype html>", "x.json")).toThrow(/non-JSON/)
  })
})

group("sauvegarde de collection", () => {
  const backup = toBackup(COLLECTION, "2026-09-16T12:00:00.000Z")

  it("relit exactement ce que l'export écrit", () => {
    const parsed = parse(JSON.parse(JSON.stringify(backup)), "c.json")
    expect(parsed).toEqual({ kind: "collection", collection: COLLECTION, rejected: 0 })
  })

  it("refuse une autre version, ou une sauvegarde qui n'en porte pas", () => {
    expect(() => parse({ ...backup, version: 2 }, "c.json")).toThrow(/version 2, attendu 1/)
    const { version: _v, ...sans } = backup
    expect(() => parse(sans, "c.json")).toThrow(IngestError)
  })

  it("écarte les entrées sans quantité entière positive, et les compte", () => {
    const parsed = parse(
      {
        version: 1,
        collection: {
          ok: { qty: 2, name: "Zébu - Calme" },
          zero: { qty: 0 },
          texte: { qty: "3" },
          demi: { qty: 1.5 },
          vide: null,
        },
      },
      "c.json"
    )
    if (parsed.kind !== "collection") throw new Error("mauvaise forme")
    expect(Object.keys(parsed.collection)).toEqual(["ok"])
    expect(parsed.collection.ok).toEqual({
      qty: 2,
      addedAt: "",
      name: "Zébu - Calme",
      set: "",
      num: null,
      rarity: null,
    })
    expect(parsed.rejected).toBe(4)
  })

  it("annonce le remplacement de la collection en place", () => {
    const parsed = parse(backup, "c.json")
    const u3 = { u3: COLLECTION.u3 }
    expect(describe(parsed, "c.json", [], u3)).toBe(
      "Collection restaurée depuis c.json : 2 versions, 4 exemplaires. Elle remplace la précédente (1 version)."
    )
    expect(describe(parsed, "c.json", [])).toBe(
      "Collection restaurée depuis c.json : 2 versions, 4 exemplaires."
    )
  })
})

group("registre des formats", () => {
  /** Le plus petit fichier valide de chaque format. */
  const SAMPLES: Record<string, unknown> = {
    products: { version: 1, products: [] },
    priceGuides: { version: 1, priceGuides: [] },
    cards: { cards: [{ name: "Zébu - Calme", printings: [] }] },
    collection: { version: 1, collection: {} },
  }

  it("chaque format annoncé est reconnu par parse", () => {
    for (const format of IMPORT_FORMATS) {
      expect(SAMPLES, format.key).toHaveProperty(format.key)
      expect(() => parse(SAMPLES[format.key], "x.json")).not.toThrow()
    }
  })

  it("nomme les clés attendues quand la structure est inconnue", () => {
    expect(() => parse({ autre: [] }, "x.json")).toThrow(
      "x.json : structure inconnue — attendu une clé products, priceGuides, cards ou collection."
    )
  })
})
