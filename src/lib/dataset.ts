/**
 * Construction des lignes de table à partir du catalogue et des cotes :
 * une ligne par produit, puis un regroupement par carte via idMetacard.
 */
import { minOf } from "@/lib/format"
import { lookup, type EnrichIndex } from "@/lib/enrich"
import type { CardRow, CodeMap, Price, Product, Row } from "@/types"

type BuildArgs = {
  catalog: Product[]
  prices: Record<string, Price>
  expansions: Record<string, string>
  codes: CodeMap
  enrich: EnrichIndex
}

const codeOf = (codes: CodeMap, exp: number | string) => codes[String(exp)]?.code ?? ""

/** Tri alphabétique français. Il fixe aussi l'ordre des ex æquo : à valeur égale,
 *  TanStack retombe sur l'index d'origine, donc sur ce tri-ci. */
const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "fr")

/** Produit + cotes + dérivés + enrichissement, une ligne par produit Cardmarket. */
export function buildRows({ catalog, prices, expansions, codes, enrich }: BuildArgs): Row[] {
  return catalog
    .map((p) => {
      const pr = prices[String(p.id)] ?? ({} as Partial<Price>)
      const expName = expansions[String(p.exp)] ?? `Extension ${p.exp}`
      const e = enrich.on ? lookup(enrich, p.name, p.exp) : null

      const d =
        pr.trend != null && pr.low != null && pr.low > 0
          ? ((pr.trend - pr.low) / pr.low) * 100
          : null
      const df =
        pr.avgF != null && pr.lowF != null && pr.lowF > 0
          ? ((pr.avgF - pr.lowF) / pr.lowF) * 100
          : null

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
    .sort(byName)
}

/**
 * Regroupe les impressions d'une même carte via idMetacard.
 * C'est la vue qui compte pour la complétion : « combien pour obtenir cette
 * carte, peu importe la version ».
 */
export function buildCards(
  rows: Row[],
  expansions: Record<string, string>,
  codes: CodeMap
): CardRow[] {
  const byMetacard = new Map<number, Row[]>()
  for (const r of rows) {
    if (!r.mc) continue
    const group = byMetacard.get(r.mc)
    if (group) group.push(r)
    else byMetacard.set(r.mc, [r])
  }

  return [...byMetacard.entries()]
    .map(([mc, rs]) => {
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
        code: prints
          .map((p) => codeOf(codes, p.exp))
          .filter(Boolean)
          .join(" "),
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
    .sort(byName)
}

export function countByExpansion(rows: Row[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of rows) counts[String(r.exp)] = (counts[String(r.exp)] ?? 0) + 1
  return counts
}
