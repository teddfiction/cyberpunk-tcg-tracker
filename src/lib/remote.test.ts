/**
 * Gardes du téléchargement à chaud. Ce sont elles qui font la valeur du
 * fichier : sans elles, une page d'erreur ou un relais absent renvoient 200 et
 * l'échec ne se manifesterait que bien plus loin, sans message utile.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

import { IngestError } from "@/lib/ingest"
import { PRICE_GUIDE_NAME, fetchPriceGuide } from "@/lib/remote"

// Une Response neuve à chaque appel : son corps ne se lit qu'une fois.
const answer = (body: string, init: ResponseInit = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => new Response(body, { status: 200, ...init }))
  )

afterEach(() => vi.unstubAllGlobals())

describe("fetchPriceGuide", () => {
  it("rend un File nommé comme l'export, prêt pour importFiles", async () => {
    answer(JSON.stringify({ priceGuides: [], createdAt: "2026-09-15" }))
    const file = await fetchPriceGuide()
    expect(file.name).toBe(PRICE_GUIDE_NAME)
    expect(JSON.parse(await file.text()).createdAt).toBe("2026-09-15")
  })

  it("refuse une réponse non-JSON, et nomme la cause probable", async () => {
    // Le cas réel : un `dist/` servi en statique n'a pas de relais, et rend
    // l'index HTML avec un 200. Mesuré.
    answer("<!doctype html><html lang=\"fr\">")
    await expect(fetchPriceGuide()).rejects.toThrow(IngestError)
    await expect(fetchPriceGuide()).rejects.toThrow(/relais de téléchargement est absent/)
  })

  it("rend le code quand Cardmarket refuse", async () => {
    // Un chemin inconnu derrière le relais rend un 403 XML. Mesuré aussi.
    answer("<Error><Code>AccessDenied</Code></Error>", { status: 403 })
    await expect(fetchPriceGuide()).rejects.toThrow(/403/)
  })

  it("distingue l'injoignable du refus", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))
    await expect(fetchPriceGuide()).rejects.toThrow(/injoignable/)
  })
})
