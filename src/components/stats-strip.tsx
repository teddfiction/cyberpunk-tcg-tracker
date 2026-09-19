/**
 * Quatre repères de cadrage au-dessus de la table, dans les modules de la
 * collection (`Stats`).
 * La somme des minis n'est pas une valorisation : `low` est la plus petite
 * annonce, pas un prix de vente — le libellé doit rester prudent.
 */
import { Of, Stat, Stats } from "@/components/stats"
import { eur } from "@/lib/format"
import type { CardRow, Row } from "@/types"

export function StatsStrip({ rows, cards }: { rows: Row[]; cards: CardRow[] }) {
  // Une seule passe : trois `filter` séparés relisaient le tableau trois fois.
  const { singles, withPrice, totalLow } = rows.reduce(
    (acc, r) => ({
      singles: acc.singles + (r.single ? 1 : 0),
      withPrice: acc.withPrice + (r.hasPrice ? 1 : 0),
      totalLow: acc.totalLow + (r.low ?? 0),
    }),
    { singles: 0, withPrice: 0, totalLow: 0 }
  )

  return (
    <Stats>
      <Stat label="cartes uniques">{cards.length}</Stat>
      <Stat label="produits singles">
        <Of n={singles} total={rows.length} />
      </Stat>
      <Stat label="produits cotés">{withPrice}</Stat>
      <Stat label="somme des prix mini">{eur(totalLow)}</Stat>
    </Stats>
  )
}
