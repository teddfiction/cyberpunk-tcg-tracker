/** Export CSV : format Excel FR, et colonnes alignées sur celles affichées. */
import { describe, expect, it } from "vitest"

import { toCsv } from "@/lib/csv"
import { CODES } from "@/test/fixtures"
import { makeTable } from "@/test/table"

const lines = (mode: Parameters<typeof makeTable>[0], state = {}) =>
  toCsv(makeTable(mode, state), CODES).split("\n")

describe("toCsv", () => {
  it("reprend les en-têtes des colonnes affichées", () => {
    expect(lines("normal")[0]).toBe(
      '"Produit";"Code";"Extension";"Moyenne";"Mini";"Tendance";"Δ tend./mini";"ID"'
    )
  })

  it("exporte les lignes filtrées, dans l'ordre affiché", () => {
    const out = lines("normal", {
      sorting: [{ id: "low", desc: true }],
      columnFilters: [{ id: "priced", value: true }],
    })
    expect(out).toHaveLength(5)
    expect(out[1]).toContain('"Zébu - Calme"')
    expect(out[1]).toContain("15,00")
  })

  it("écrit les décimaux à la virgule et laisse les entiers bruts", () => {
    const row = lines("normal", { sorting: [{ id: "low", desc: true }] })[1]
    expect(row).toContain("20,00")
    expect(row.endsWith(";14")).toBe(true)
  })

  it("laisse une cellule vide pour une cote absente", () => {
    const out = lines("normal", { globalFilter: "Booster" })
    expect(out[1]).toBe('"Booster Box";"A1";"Alpha Kit";;;;;13')
  })

  it("garde un nombre de colonnes constant", () => {
    for (const mode of ["normal", "foil", "card"] as const) {
      const out = lines(mode)
      const width = out[0].split(";").length
      for (const line of out) expect(line.split(";")).toHaveLength(width)
    }
  })

  it("laisse le visuel hors de l'export : ce sont des data URI", () => {
    const enriched = (mode: Parameters<typeof makeTable>[0]) =>
      toCsv(makeTable(mode, {}, true), CODES).split("\n")
    expect(enriched("normal")[0].startsWith('"Produit"')).toBe(true)
    expect(enriched("normal")[0]).not.toContain("thumb")
    expect(enriched("normal")[1]).not.toContain("data:image")
  })

  it("rend les codes d'impression dans la colonne Impressions", () => {
    const out = lines("card", { globalFilter: "zébu" })
    expect(out[1]).toContain('"A1 C1"')
  })
})
