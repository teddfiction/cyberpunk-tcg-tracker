/**
 * Gardes du téléchargement à chaud. Ce sont elles qui font la valeur du
 * fichier : sans elles, une page d'erreur ou un relais absent renvoient 200 et
 * l'échec ne se manifesterait que bien plus loin, sans message utile.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import { CARDMARKET_FILES } from "@/data/cardmarket"
import { IngestError } from "@/lib/ingest"
import { fetchCardmarket } from "@/lib/remote"

// Une Response neuve à chaque appel : son corps ne se lit qu'une fois.
const answer = (body: string, init: ResponseInit = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => new Response(body, { status: 200, ...init }))
  )

afterEach(() => vi.unstubAllGlobals())

describe("fetchCardmarket", () => {
  it("rend un File par export, nommé comme lui et prêt pour importFiles", async () => {
    answer(JSON.stringify({ version: 1, products: [], createdAt: "2026-09-15" }))
    const files = await fetchCardmarket()
    expect(files.map((f) => f.name)).toEqual(CARDMARKET_FILES.map((f) => f.name))
    expect(JSON.parse(await files[0].text()).createdAt).toBe("2026-09-15")
  })

  it("charge les catalogues avant le price guide", () => {
    // `describe()` compte les produits sans cote sur le catalogue déjà chargé :
    // dans l'autre sens, le compte rendu du price guide serait faux.
    const noms = CARDMARKET_FILES.map((f) => f.name)
    expect(noms.indexOf("price_guide_23.json")).toBe(noms.length - 1)
  })

  it("refuse une réponse non-JSON, et nomme la cause probable", async () => {
    // Le cas réel : un `dist/` servi en statique n'a pas de relais, et rend
    // l'index HTML avec un 200. Mesuré.
    answer('<!doctype html><html lang="fr">')
    await expect(fetchCardmarket()).rejects.toThrow(IngestError)
    await expect(fetchCardmarket()).rejects.toThrow(/relais de téléchargement est absent/)
  })

  it("rend le code quand Cardmarket refuse", async () => {
    // Un chemin inconnu derrière le relais rend un 403 XML. Mesuré aussi.
    answer("<Error><Code>AccessDenied</Code></Error>", { status: 403 })
    await expect(fetchCardmarket()).rejects.toThrow(/403/)
  })

  it("distingue l'injoignable du refus", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))
    await expect(fetchCardmarket()).rejects.toThrow(/injoignable/)
  })

  it("ne rend rien si un seul des trois échoue", async () => {
    // Un import partiel laisserait catalogue et cotes à des dates différentes.
    let n = 0
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () =>
        ++n === 2 ? new Response("", { status: 500 }) : new Response(JSON.stringify({ products: [] }))
      )
    )
    await expect(fetchCardmarket()).rejects.toThrow(/500/)
  })
})
