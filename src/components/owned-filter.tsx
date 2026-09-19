/**
 * Filtre de possession de la collection : Toutes, Possédées, Manquantes, en
 * `ToggleGroup` à choix unique — un groupe radio, une option et une seule. Une
 * seule donnée derrière : le filtre TanStack de la colonne Possédée / Manquante.
 */
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MISSING, OWNED } from "@/lib/collection"

/** « Toutes » n'est pas un filtre : c'est l'absence de filtre. */
const ALL = "all"

/**
 * L'option choisie : bordure jaune, fond de la page — gris au survol pour les
 * autres seulement. Le registry ôte la bordure gauche des options suivantes
 * pour ne pas doubler le filet : l'option choisie n'aurait que trois côtés
 * jaunes. On rend donc sa bordure à chacune, on les fait chevaucher d'un pixel,
 * et l'option choisie passe au-dessus de ses voisines.
 */
const ITEM =
  "data-[spacing=0]:data-[variant=outline]:border-l not-first:-ml-px data-[state=on]:z-10 data-[state=on]:border-primary data-[state=on]:bg-background data-[state=on]:hover:bg-background"

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
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Possession"
      value={value ?? ALL}
      // Radix laisse décocher l'option active, et rend alors une chaîne vide :
      // on l'ignore, comme un groupe radio.
      onValueChange={(next) => next && onChange(next === ALL ? undefined : next)}
    >
      {CHOICES.map((choice) => (
        <ToggleGroupItem key={choice.value} value={choice.value} className={ITEM}>
          {choice.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
