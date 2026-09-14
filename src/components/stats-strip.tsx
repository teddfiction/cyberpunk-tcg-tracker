/**
 * Quatre repères de cadrage au-dessus de la table.
 * La somme des minis n'est pas une valorisation : `low` est la plus petite
 * annonce, pas un prix de vente — le libellé doit rester prudent.
 */
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

  const items: [React.ReactNode, string][] = [
    [cards.length, "cartes uniques"],
    [
      <>
        {singles}
        <span className="text-muted-foreground text-base font-normal"> / {rows.length}</span>
      </>,
      "produits singles",
    ],
    [withPrice, "produits cotés"],
    [eur(totalLow), "somme des prix mini"],
  ]

  return (
    <div className="grid grid-cols-2 gap-px border md:grid-cols-4">
      {items.map(([value, label], i) => (
        <div key={i} className="bg-card p-3">
          <div className="text-xl font-semibold tracking-tight tabular-nums">{value}</div>
          <div className="text-muted-foreground text-xs">{label}</div>
        </div>
      ))}
    </div>
  )
}
