/**
 * Trois repères sous les onglets de la collection, pour le niveau choisi :
 * possédées, avec leur part en barre et en pour cent, manquantes, exemplaires.
 * Pas de valeur en euros — la somme des `low` n'est pas une valorisation, et
 * une cote n'est attribuable qu'à une partie des versions.
 *
 * Mêmes modules que les repères de la table des cotes (`Stats`), sur le fond
 * de la page : l'aplat gris est aux onglets, au-dessus.
 */
import { Of, Stat, Stats } from "@/components/stats"
import { share } from "@/lib/format"
import type { LevelStats } from "@/lib/collection"

export function CollectionStats({ stats }: { stats: LevelStats }) {
  // Arrondie par défaut : 100 % ne s'affiche qu'une fois le niveau complet.
  const percent = share(stats.owned, stats.total)

  return (
    <Stats>
      <Stat label="possédées" progress={percent}>
        <Of n={stats.owned} total={stats.total} percent={percent} />
      </Stat>
      <Stat label="manquantes">{stats.missing}</Stat>
      <Stat label="exemplaires">{stats.copies}</Stat>
    </Stats>
  )
}
