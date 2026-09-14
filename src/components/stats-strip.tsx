import { eur } from "@/lib/format"
import type { CardRow, Row } from "@/types"

/** Quatre repères de cadrage. La somme des minis n'est pas une valorisation :
 *  `low` est la plus petite annonce, pas un prix de vente. */
export function StatsStrip({ rows, cards }: { rows: Row[]; cards: CardRow[] }) {
  const singles = rows.filter((r) => r.single).length
  const withPrice = rows.filter((r) => r.hasPrice).length
  const totalLow = rows.reduce((s, r) => s + (r.low ?? 0), 0)

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
