import { minOf, norm } from "@/lib/format"
import { lookup, type EnrichIndex } from "@/lib/enrich"
import type { CardRow, CodeMap, Filters, Price, Product, Row } from "@/types"

type BuildArgs = {
  catalog: Product[]
  prices: Record<string, Price>
  expansions: Record<string, string>
  codes: CodeMap
  enrich: EnrichIndex
}

const codeOf = (codes: CodeMap, exp: number | string) => codes[String(exp)]?.code ?? ""

/** Produit + cotes + dérivés + enrichissement, une ligne par produit Cardmarket. */
export function buildRows({ catalog, prices, expansions, codes, enrich }: BuildArgs): Row[] {
  return catalog.map((p) => {
    const pr = prices[String(p.id)] ?? ({} as Partial<Price>)
    const expName = expansions[String(p.exp)] ?? `Extension ${p.exp}`
    const e = enrich.on ? lookup(enrich, p.name, p.exp) : null

    const d =
      pr.trend != null && pr.low != null && pr.low > 0 ? ((pr.trend - pr.low) / pr.low) * 100 : null
    const df =
      pr.avgF != null && pr.lowF != null && pr.lowF > 0 ? ((pr.avgF - pr.lowF) / pr.lowF) * 100 : null

    return {
      ...p,
      ...pr,
      expName,
      code: codeOf(codes, p.exp),
      d,
      df,
      num: e?.number ?? null,
      rarity: e?.rarity ?? null,
      thumb: e?.thumb ?? null,
      slug: e?.slug ?? null,
      uuid: e?.uuid ?? null,
      hasPrice: [pr.avg, pr.low, pr.trend, pr.avgF, pr.lowF].some((v) => v != null),
      hasPriceF: pr.avgF != null || pr.lowF != null,
      single: p.cat === "Single",
    }
  })
}

/**
 * Regroupe les impressions d'une même carte via idMetacard.
 * C'est la vue qui compte pour la complétion : « combien pour obtenir cette
 * carte, peu importe la version ».
 */
export function buildCards(rows: Row[], expansions: Record<string, string>, codes: CodeMap): CardRow[] {
  const byMetacard = new Map<number, Row[]>()
  for (const r of rows) {
    if (!r.mc) continue
    byMetacard.set(r.mc, [...(byMetacard.get(r.mc) ?? []), r])
  }

  return [...byMetacard.entries()].map(([mc, rs]) => {
    const prints = [...new Set(rs.map((r) => r.exp))]
      .map((exp) => ({ exp }))
      .sort((a, b) => (codeOf(codes, a.exp) || "zz").localeCompare(codeOf(codes, b.exp) || "zz"))

    const bestLow = minOf(rs.map((r) => r.low))
    const bestTrend = minOf(rs.map((r) => r.trend))
    const bestLowF = minOf(rs.map((r) => r.lowF))

    return {
      mc,
      name: rs[0].name,
      rows: rs,
      nExp: rs.length,
      prints,
      exps: prints.map((p) => p.exp),
      expName: prints.map((p) => expansions[String(p.exp)] ?? `Extension ${p.exp}`).join(" · "),
      code: prints.map((p) => codeOf(codes, p.exp)).filter(Boolean).join(" "),
      bestLow,
      bestTrend,
      bestLowF,
      hasPrice: [bestLow, bestTrend, bestLowF].some((v) => v != null),
      hasPriceF: bestLowF != null,
      single: true,
      id: rs[0].id,
      thumb: rs.find((r) => r.thumb)?.thumb ?? null,
    }
  })
}

export function countByExpansion(rows: Row[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of rows) counts[String(r.exp)] = (counts[String(r.exp)] ?? 0) + 1
  return counts
}

const TEXT_KEYS = new Set(["name", "expName", "code", "num"])

/** Filtre puis trie. Les valeurs nulles finissent toujours en bas, quel que soit le sens. */
export function selectRows(rows: Row[], cards: CardRow[], f: Filters): (Row | CardRow)[] {
  const source: (Row | CardRow)[] = f.mode === "card" ? cards : rows
  const needle = f.q.trim().toLowerCase()

  const filtered = source.filter((r) => {
    if (needle) {
      const anyRow = r as Row & CardRow
      const hay = `${r.name} ${r.expName} ${r.code ?? ""} ${anyRow.num ?? ""} ${r.id}`
      if (!hay.toLowerCase().includes(needle)) return false
    }
    if (f.exps.length) {
      const ex = f.mode === "card" ? (r as CardRow).exps.map(String) : [String((r as Row).exp)]
      if (!ex.some((e) => f.exps.includes(e))) return false
    }
    if (f.onlySingles && !r.single) return false
    if (f.hideEmpty && (f.mode === "foil" ? !r.hasPriceF : !r.hasPrice)) return false
    return true
  })

  const { k, dir } = f.sort
  const way = dir === "asc" ? 1 : -1

  return [...filtered].sort((a, b) => {
    const x = (a as Record<string, unknown>)[k]
    const y = (b as Record<string, unknown>)[k]
    if (TEXT_KEYS.has(k)) return String(x ?? "").localeCompare(String(y ?? ""), "fr") * way
    if (x == null && y == null) return a.name.localeCompare(b.name, "fr")
    if (x == null) return 1
    if (y == null) return -1
    const nx = x as number
    const ny = y as number
    return nx === ny ? a.name.localeCompare(b.name, "fr") : (nx < ny ? -1 : 1) * way
  })
}

export const matchesName = (a: string, b: string) => norm(a) === norm(b)
