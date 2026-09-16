/**
 * Construction des lignes de table à partir du catalogue et des cotes :
 * une ligne par produit, puis un regroupement par carte via idMetacard.
 */
import { minOf, norm } from "@/lib/format"
import { printingsFor, type EnrichIndex } from "@/lib/enrich"
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

const variantKey = (name: string, exp: number) => `${norm(name)}|${exp}`

/** Produit + cotes + dérivés + enrichissement, une ligne par produit Cardmarket. */
export function buildRows({ catalog, prices, expansions, codes, enrich }: BuildArgs): Row[] {
  // Combien de produits Cardmarket partagent ce nom dans cette extension ?
  // Au-delà d'un seul, ce sont des variantes que rien ne distingue : ni nom, ni
  // numéro, ni rareté côté Cardmarket. Voir CLAUDE.md § « Limites des données ».
  const variants = new Map<string, number>()
  for (const p of catalog) {
    const k = variantKey(p.name, p.exp)
    variants.set(k, (variants.get(k) ?? 0) + 1)
  }

  return catalog
    .map((p) => {
      const pr = prices[String(p.id)] ?? ({} as Partial<Price>)
      const expName = expansions[String(p.exp)] ?? `Extension ${p.exp}`
      const printings = enrich.on ? printingsFor(enrich, p.name, p.exp) : []
      // Quand les impressions connues dans l'extension s'accordent, leur rareté
      // vaut pour toutes les versions Cardmarket de la carte. Quand elles
      // divergent — une rareté de base et sa variante Iconic ou Nova Rare, cas
      // de 43 cartes sur 151 —, on liste les candidates sans en élire une :
      // rien ne dit quelle version est ce produit.
      const known = [...new Set(printings.map((x) => x.rarity).filter((x): x is string => !!x))]
      // Numéro et uuid désignent une impression : seulement s'il n'y en a qu'une.
      const e = printings.length === 1 ? printings[0] : null

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
        rarity: known.length === 1 ? known[0] : null,
        rarities: known.length > 1 ? known : [],
        variants: variants.get(variantKey(p.name, p.exp)) ?? 1,
        // slug identifie la carte et non l'impression : toujours sûr. La
        // miniature est celle de la première impression connue qui en a une —
        // pas forcément la version de ce produit, que rien ne désigne.
        thumb: printings.find((x) => x.thumb)?.thumb ?? null,
        slug: printings[0]?.slug ?? null,
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
        // Le plus récent de ses produits : une carte est « nouvelle » dès
        // qu'une de ses versions l'est. Comparaison de chaînes — le format
        // Cardmarket est à largeur fixe, donc lexicographique = chronologique.
        added: rs.reduce((max, r) => (r.added > max ? r.added : max), ""),
      }
    })
    .sort(byName)
}

export function countByExpansion(rows: Row[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const r of rows) counts[String(r.exp)] = (counts[String(r.exp)] ?? 0) + 1
  return counts
}
