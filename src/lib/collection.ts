/**
 * Collection : les versions possédées, et les grilles qu'elles forment — ce
 * qu'on a, ce qui manque.
 *
 * Une tuile par version et non par carte : sinon les facettes porteraient sur
 * toutes les impressions de la carte, et filtrer « Iconic Legend » garderait une
 * carte dont on ne possède que la Rare.
 */
import { narrow } from "@/lib/printings"
import type { Collection, GridCard, Owned, PrintRow } from "@/types"

/**
 * Identifiant de la facette Possédée / Manquante. Nommé parce que la collection
 * la masque en dehors du registre — elle n'y aurait qu'une valeur.
 */
export const OWNED_FACET = "owned"
export const OWNED = "Possédée"
export const MISSING = "Manquante"

/**
 * Périmètre de la grille de cartes : la base entière, une tuile par carte ; ou
 * la collection, une tuile par version — possédée, ou manquante. Même vue,
 * mêmes composants.
 */
export type Scope = "all" | "owned" | "missing"

/** Onglets de la collection, dans l'ordre : le libellé de chaque périmètre. */
export const COLLECTION_TABS = {
  owned: "Collectées",
  missing: "Manquantes",
} as const satisfies Partial<Record<Scope, string>>

export type CollectionTab = keyof typeof COLLECTION_TABS

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
 * Une tuile par impression retenue, dans l'ordre de la grille : nom en
 * collation française, puis rang dans la carte. Les ex æquo des tris retombent
 * donc sur cet ordre-là, sans comparateur à écrire.
 *
 * Chaque tuile ne porte que sa version : set, rareté et cote sont les siens, ce
 * qui rend les facettes exactes.
 */
function versionGrid(grid: GridCard[], keep: (p: PrintRow) => boolean): GridCard[] {
  return grid.flatMap((card) => card.printings.filter(keep).map((p) => narrow(card, [p], p.uuid)))
}

/** Ce qu'on a : une tuile par version possédée. */
export const ownedGrid = (grid: GridCard[]) => versionGrid(grid, (p) => p.qty > 0)

/**
 * Ce qui manque : une tuile par version que la collection n'a pas. Le
 * complément exact de `ownedGrid` — les deux onglets se partagent les versions
 * de la base, sans en perdre ni en compter deux fois.
 */
export const missingGrid = (grid: GridCard[]) => versionGrid(grid, (p) => p.qty <= 0)

/**
 * La grille d'un périmètre, tirée de la base de cartes. `Record<Scope, …>` :
 * un périmètre ajouté sans sa grille ne compile pas.
 */
export const SCOPE_GRID: Record<Scope, (grid: GridCard[]) => GridCard[]> = {
  all: (grid) => grid,
  owned: ownedGrid,
  missing: missingGrid,
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

export type CollectionStats = {
  cards: number
  totalCards: number
  versions: number
  totalVersions: number
  copies: number
}

/**
 * Complétion, mesurée sur la base de cartes entière et non sur la collection :
 * une entrée orpheline n'a pas de carte à compléter.
 */
export function collectionStats(grid: GridCard[]): CollectionStats {
  const printings = grid.flatMap((c) => c.printings)
  const owned = printings.filter((p) => p.qty > 0)
  return {
    cards: grid.filter((c) => c.owned > 0).length,
    totalCards: grid.length,
    versions: owned.length,
    totalVersions: printings.length,
    copies: owned.reduce((n, p) => n + p.qty, 0),
  }
}

/** Nom du fichier de sauvegarde, daté pour qu'un export n'écrase pas le précédent. */
export const backupName = (now = new Date()) =>
  `cyberpunk-tcg-collection-${now.toISOString().slice(0, 10)}.json`
