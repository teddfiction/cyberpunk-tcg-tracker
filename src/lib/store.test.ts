/** Aller-retour IndexedDB, et dégradation propre quand le stockage manque. */
import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"

import { idbDelete, idbGet, idbSet } from "@/lib/store"

describe("store", () => {
  beforeEach(async () => {
    await idbDelete("k")
  })

  it("rend null pour une clé absente", async () => {
    expect(await idbGet("jamais-ecrite")).toBeNull()
  })

  it("conserve un objet structuré à l'identique", async () => {
    const payload = { cards: [{ name: "Zébu", printings: [{ thumb: "data:image/webp;base64,AA" }] }] }
    expect(await idbSet("k", payload)).toBe(true)
    expect(await idbGet("k")).toEqual(payload)
  })

  it("écrase la valeur précédente", async () => {
    await idbSet("k", { n: 1 })
    await idbSet("k", { n: 2 })
    expect(await idbGet("k")).toEqual({ n: 2 })
  })

  it("oublie sur demande", async () => {
    await idbSet("k", { n: 1 })
    expect(await idbDelete("k")).toBe(true)
    expect(await idbGet("k")).toBeNull()
  })

  it("sans IndexedDB, échoue sans lever", async () => {
    const real = globalThis.indexedDB
    // @ts-expect-error on simule un navigateur qui refuse le stockage
    delete globalThis.indexedDB
    expect(await idbGet("k")).toBeNull()
    expect(await idbSet("k", { n: 1 })).toBe(false)
    globalThis.indexedDB = real
  })
})
