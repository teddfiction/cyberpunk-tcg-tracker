/**
 * Collection : les versions possédées, et les niveaux auxquels on la mesure —
 * le jeu de base, toutes les raretés, chaque version.
 *
 * Chaque niveau montre toutes ses tuiles, possédées ou non : c'est au milieu de
 * ce qu'on a que se voit ce qui manque. Une tuile ne porte que ses impressions,
 * sinon filtrer « Iconic Legend » garderait une carte dont on n'a que la Rare.
 */
import { isBaseRarity } from "@/data/rarities"
import { collectibles, narrow } from "@/lib/printings"
import type { Collection, GridCard, Owned, PrintRow } from "@/types"

/**
 * Identifiant de la colonne Possédée / Manquante. Pas une facette : le sélecteur
 * Toutes / Possédées / Manquantes de la collection filtre à travers elle, et la
 * base de cartes ne la propose pas.
 */
export const OWNED_FACET = "owned"
export const OWNED = "Possédée"
export const MISSING = "Manquante"

export type LevelConfig = {
  label: string
  /** Sous-titre de l'onglet : ce que ce niveau demande de réunir. */
  hint: string
  /** Ce que compte une tuile, au singulier : le compteur l'accorde. */
  unit: string
  /** Tuiles du niveau, tirées de la base de cartes. */
  grid: (grid: GridCard[]) => GridCard[]
}

/**
 * Toutes les raretés : une tuile par carte à collectionner — par rareté, et par
 * illustration alternative (`collectibles`). Une réimpression la complète
 * comme une autre : #109 ou #β109 de Sasha, c'est la même Secret.
 */
const fullGrid = (grid: GridCard[]) => grid.flatMap(collectibles)

/**
 * Jeu de base : les cartes à collectionner de Common à Secret. Une carte peut en
 * compter deux — V - Streetkid #005a et #005b, ou Minotaur en Uncommon et en
 * Epic —, et une carte seulement Nova Rare n'en compte aucune.
 */
const baseGrid = (grid: GridCard[]) => fullGrid(grid).filter((c) => c.rarities.some(isBaseRarity))

/**
 * Masterset : une tuile par version, réimpressions comprises. Dans l'ordre de la
 * grille — nom, puis rang dans la carte — : les ex æquo des tris retombent sur
 * cet ordre-là.
 */
const mastersetGrid = (grid: GridCard[]) =>
  grid.flatMap((card) => card.printings.map((p) => narrow(card, [p], p.uuid)))

/**
 * Niveaux de la collection, dans l'ordre des onglets : chacun demande un peu plus
 * que le précédent, et le contient. Ajouter un niveau, c'est une entrée ici ; le
 * compilateur réclame ensuite son CSV et sa note (`netdeck-view.tsx`).
 */
export const LEVELS = {
  base: {
    label: "Jeu de base",
    hint: "La collection de cartes du jeu de base",
    unit: "carte",
    grid: baseGrid,
  },
  full: {
    label: "Toutes les raretés",
    hint: "La collection ultime avec toutes les Iconic et Nova",
    unit: "carte",
    grid: fullGrid,
  },
  masterset: {
    label: "Masterset",
    hint: "Collectionneur Hardcore, toutes les versions de cartes qui te manquent",
    unit: "version",
    grid: mastersetGrid,
  },
} as const satisfies Record<string, LevelConfig>

export type Level = keyof typeof LEVELS

/** Ordre des onglets. */
export const LEVEL_IDS = Object.keys(LEVELS) as Level[]

/**
 * Périmètre de la grille de cartes : la base entière, une tuile par carte ; ou
 * un niveau de la collection. Même vue, mêmes composants.
 */
export type Scope = "all" | Level

/** La grille d'un périmètre, tirée de la base de cartes. */
export const scopeGrid = (scope: Scope, grid: GridCard[]): GridCard[] =>
  scope === "all" ? grid : LEVELS[scope].grid(grid)

export const qtyOf = (collection: Collection, uuid: string) => collection[uuid]?.qty ?? 0

/**
 * Pose la quantité d'une impression. 0 ou moins la retire.
 *
 * Rend la même référence quand rien ne change : React ne re-rend pas, et la
 * conservation n'écrit pas pour rien.
 */
export function withQty(
  collection: Collection,
  printing: PrintRow,
  qty: number,
  now = new Date().toISOString()
): Collection {
  if (!Number.isFinite(qty)) return collection
  const n = Math.floor(qty)
  const current = collection[printing.uuid]

  if (n <= 0) {
    if (!current) return collection
    const { [printing.uuid]: _removed, ...rest } = collection
    return rest
  }
  if (current?.qty === n) return collection

  return {
    ...collection,
    [printing.uuid]: {
      qty: n,
      addedAt: current?.addedAt ?? now,
      name: printing.name,
      set: printing.set,
      num: printing.num,
      rarity: printing.rarity,
    },
  }
}

/**
 * Entrées que la base importée ne connaît pas. Gardées, jamais purgées : une
 * base plus ancienne ou incomplète ne doit pas coûter une saisie manuelle.
 */
export function orphans(collection: Collection, grid: GridCard[]): (Owned & { uuid: string })[] {
  const known = new Set(grid.flatMap((c) => c.printings.map((p) => p.uuid)))
  return Object.entries(collection)
    .filter(([uuid]) => !known.has(uuid))
    .map(([uuid, owned]) => ({ uuid, ...owned }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr") || a.set.localeCompare(b.set, "fr"))
}

/** Versions et exemplaires d'une collection, sans la base : import et Paramètres. */
export function summarize(collection: Collection): { versions: number; copies: number } {
  const entries = Object.values(collection)
  return { versions: entries.length, copies: entries.reduce((n, o) => n + o.qty, 0) }
}

export type LevelStats = {
  /** Tuiles dont on possède au moins un exemplaire. */
  owned: number
  missing: number
  total: number
  /** Exemplaires possédés sur les tuiles du niveau. */
  copies: number
}

/**
 * Complétion d'un niveau, mesurée sur toutes ses tuiles et non sur celles que
 * les filtres laissent voir : une entrée orpheline n'a pas de tuile à compléter.
 */
export function levelStats(tiles: GridCard[]): LevelStats {
  const owned = tiles.filter((t) => t.owned > 0).length
  return {
    owned,
    missing: tiles.length - owned,
    total: tiles.length,
    copies: tiles.reduce((n, t) => n + t.owned, 0),
  }
}

/** Nom du fichier de sauvegarde, daté pour qu'un export n'écrase pas le précédent. */
export const backupName = (now = new Date()) =>
  `cyberpunk-tcg-collection-${now.toISOString().slice(0, 10)}.json`
