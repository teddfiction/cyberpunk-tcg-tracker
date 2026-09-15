/**
 * Raretés du Cyberpunk TCG, de la plus commune à la plus rare.
 * Sert au tri de la colonne Rareté et à normaliser ce que renvoie Netdeck,
 * dont on ne maîtrise ni la casse ni la ponctuation.
 */
import { norm } from "@/lib/format"

/** L'ordre de cette liste est le rang. */
export const RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Iconic Legend",
  "Iconic Other",
  "Iconic Secret",
  "Nova Rare",
  "Secret",
] as const

const KNOWN = new Map(RARITIES.map((label, rank) => [norm(label), { label, rank }]))

/** Libellé canonique. Une valeur que Netdeck nommerait autrement est rendue telle quelle. */
export const rarityLabel = (raw: string) => KNOWN.get(norm(raw))?.label ?? raw

/** Rang de tri. Les raretés inconnues passent après les connues. */
export const rarityRank = (raw: string) => KNOWN.get(norm(raw))?.rank ?? RARITIES.length
