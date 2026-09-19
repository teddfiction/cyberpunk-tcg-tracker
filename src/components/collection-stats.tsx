/**
 * Trois repères sous les onglets de la collection, pour le niveau choisi :
 * possédées, manquantes, exemplaires. Pas de valeur en euros — la somme des
 * `low` n'est pas une valorisation, et une cote n'est attribuable qu'à une
 * partie des versions.
 *
 * Sur le fond de la page, bordés comme le champ de recherche et les filtres
 * (`input`) : l'aplat gris est aux onglets, au-dessus. Le filet entre deux
 * repères est le fond du conteneur, vu à travers `gap-px`.
 */
import type { LevelStats } from "@/lib/collection"

export function CollectionStats({ stats }: { stats: LevelStats }) {
  const items: [React.ReactNode, string][] = [
    [<Of n={stats.owned} total={stats.total} />, "possédées"],
    [stats.missing, "manquantes"],
    [stats.copies, "exemplaires"],
  ]

  return (
    <div className="border-input bg-input grid grid-cols-3 gap-px border">
      {items.map(([value, label]) => (
        <div key={label} className="bg-background p-3">
          <div className="text-xl font-semibold tracking-tight tabular-nums">{value}</div>
          <div className="text-muted-foreground text-xs">{label}</div>
        </div>
      ))}
    </div>
  )
}

/** « 87 / 152 » : la complétion, le total en retrait comme dans `StatsStrip`. */
function Of({ n, total }: { n: number; total: number }) {
  return (
    <>
      {n}
      <span className="text-muted-foreground text-base font-normal"> / {total}</span>
    </>
  )
}
