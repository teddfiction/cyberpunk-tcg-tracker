/**
 * Trois repères en tête de la collection : cartes, versions, exemplaires.
 * Pas de valeur en euros — la somme des `low` n'est pas une valorisation, et
 * une cote n'est attribuable qu'à une partie des versions.
 */
import type { CollectionStats as Stats } from "@/lib/collection"

export function CollectionStats({ stats }: { stats: Stats }) {
  const items: [React.ReactNode, string][] = [
    [<Of n={stats.cards} total={stats.totalCards} />, "cartes"],
    [<Of n={stats.versions} total={stats.totalVersions} />, "versions"],
    [stats.copies, "exemplaires"],
  ]

  return (
    <div className="grid grid-cols-3 gap-px border">
      {items.map(([value, label]) => (
        <div key={label} className="bg-card p-3">
          <div className="text-xl font-semibold tracking-tight tabular-nums">{value}</div>
          <div className="text-muted-foreground text-xs">{label}</div>
        </div>
      ))}
    </div>
  )
}

/** « 12 / 151 » : la complétion, le total en retrait comme dans `StatsStrip`. */
function Of({ n, total }: { n: number; total: number }) {
  return (
    <>
      {n}
      <span className="text-muted-foreground text-base font-normal"> / {total}</span>
    </>
  )
}
