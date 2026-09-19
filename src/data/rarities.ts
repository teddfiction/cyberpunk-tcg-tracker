/**
 * Raretés du Cyberpunk TCG, de la plus commune à la plus rare.
 * Sert au tri de la colonne Rareté et à normaliser ce que renvoie Netdeck,
 * dont on ne maîtrise ni la casse ni la ponctuation.
 */
import { norm } from "@/lib/format"

/**
 * L'ordre de cette liste est le rang. Il suit la numérotation de Welcome to
 * Night City, relevée sur les 502 impressions : les raretés du jeu de base
 * vont de 1 à 140, **Secret comprise** — elle complète le jeu de base, ce n'est
 * pas une variante. Viennent ensuite les variantes Iconic, numérotées au-delà :
 * Legend de 141 à 158, Other de 159 à 167, Secret de 168 à 171. Nova Rare, hors
 * de cette numérotation (promos, box toppers), ferme la liste.
 */
export const RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Secret",
  "Iconic Legend",
  "Iconic Other",
  "Iconic Secret",
  "Nova Rare",
] as const

const KNOWN = new Map(RARITIES.map((label, rank) => [norm(label), { label, rank }]))

/** Libellé canonique. Une valeur que Netdeck nommerait autrement est rendue telle quelle. */
export const rarityLabel = (raw: string) => KNOWN.get(norm(raw))?.label ?? raw

/** Rang de tri. Les raretés inconnues passent après les connues. */
export const rarityRank = (raw: string) => KNOWN.get(norm(raw))?.rank ?? RARITIES.length
