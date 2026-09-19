/**
 * Filtre de possession de la collection : Toutes, Possédées, Manquantes, en
 * `ChoiceGroup` — le sélecteur de mode de la table des cotes. Une seule donnée
 * derrière : le filtre TanStack de la colonne Possédée / Manquante.
 */
import { ChoiceGroup } from "@/components/controls"
import { MISSING, OWNED } from "@/lib/collection"

/** « Toutes » n'est pas un filtre : c'est l'absence de filtre. */
const ALL = "all"

const CHOICES = [
  { value: ALL, label: "Toutes" },
  { value: OWNED, label: "Possédées" },
  { value: MISSING, label: "Manquantes" },
]

type Props = {
  /** `MISSING`, `OWNED`, ou `undefined` : toutes les tuiles. */
  value: string | undefined
  /** `undefined` pour « Toutes », jamais `false` : TanStack ne garde que les filtres actifs. */
  onChange: (next: string | undefined) => void
}

export function OwnedFilter({ value, onChange }: Props) {
  return (
    <ChoiceGroup
      label="Possession"
      choices={CHOICES}
      value={value ?? ALL}
      onChange={(next) => onChange(next === ALL ? undefined : next)}
    />
  )
}
