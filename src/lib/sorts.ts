/**
 * Tris de la grille de cartes.
 *
 * L'ordre par défaut reproduit celui de cyberpunktcg.com : couleur, puis type,
 * puis coût. Les deux rangs ci-dessous ne sont ni alphabétiques ni devinés —
 * ils sont **relevés sur l'ordre dans lequel l'API Netdeck sert les cartes**,
 * qui est exactement cet ordre. Vérifié sur les 151 cartes : trier par
 * (couleur, type, coût sans-valeur-en-dernier, nom) reproduit la réponse brute
 * à l'identique. Les modifier désaccorderait la grille d'avec le site.
 */
import type { SortingState } from "@tanstack/react-table"

/** Rang des couleurs. L'ordre de cette liste est le rang, comme `RARITIES`. */
export const COLOR_RANK = ["Red", "Yellow", "Green", "Blue"]

/** Rang des types. Même relevé. */
export const TYPE_RANK = ["Legend", "Unit", "Gear", "Program"]

export type SortConfig = { label: string; sorting: SortingState }

const asc = (id: string) => ({ id, desc: false })

/**
 * Ajoute le nom en dernier critère : deux cartes ex æquo — même coût, ou coût
 * absent — se lisent dans l'ordre alphabétique.
 *
 * Explicite plutôt que laissé à l'ordre d'origine des lignes : celui-ci ne
 * départage que si les lignes arrivent déjà triées par nom, ce que rien
 * n'impose à la grille qu'on passe à `useTable`.
 */
const thenName = (...keys: SortingState): SortingState => [...keys, asc("name")]

/**
 * Les tris proposés. Une entrée ici suffit : `SortMenu` lit le registre, et
 * `sortIdOf` retrouve l'entrée active depuis l'état TanStack — il n'y a pas de
 * copie React du tri à tenir à côté.
 */
export const SORTS = {
  default: {
    label: "Défaut (Couleur › Type › Coût)",
    sorting: thenName(asc("color"), asc("type"), asc("cost")),
  },
  name: { label: "Nom", sorting: [asc("name")] },
  color: { label: "Couleur", sorting: thenName(asc("color")) },
  type: { label: "Type", sorting: thenName(asc("type")) },
  cost: { label: "Coût", sorting: thenName(asc("cost")) },
  power: { label: "Puissance", sorting: thenName(asc("power")) },
  ram: { label: "RAM", sorting: thenName(asc("ram")) },
  num: { label: "Numéro de carte", sorting: thenName(asc("num")) },
  // Décroissant : on cherche d'abord ce qu'on a en nombre.
  qty: { label: "Exemplaires", sorting: thenName({ id: "qty", desc: true }) },
} as const satisfies Record<string, SortConfig>

export type SortId = keyof typeof SORTS

/** Ordre du menu. */
export const SORT_IDS = Object.keys(SORTS) as SortId[]

const key = (s: SortingState) => s.map((x) => `${x.id}:${x.desc}`).join(",")

/**
 * L'entrée du registre qui correspond à l'état TanStack courant.
 *
 * C'est ce qui évite de doubler le tri d'un `useState` : l'instance reste seule
 * dépositaire, le menu ne fait que la relire. Un tri qui ne vient pas du menu
 * (une colonne cliquée ailleurs) retombe sur « Défaut ».
 */
export function sortIdOf(sorting: SortingState): SortId {
  const now = key(sorting)
  return SORT_IDS.find((id) => key(SORTS[id].sorting) === now) ?? "default"
}
