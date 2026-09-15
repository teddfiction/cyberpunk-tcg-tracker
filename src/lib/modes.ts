/**
 * Registre des modes d'affichage — ce qui change quand on bascule d'onglet.
 *
 * Ajouter un mode : une entrée ici, plus sa liste de colonnes dans
 * `components/columns.tsx`. Les deux sont des `Record<Mode, …>` : le
 * compilateur réclame ce qui manque, il n'y a rien d'autre à chercher.
 */

export type ModeConfig = {
  /** Libellé de l'onglet. */
  label: string
  /** Nom des lignes, pour le compteur « 12 / 319 produits ». */
  noun: string
  /** Lignes affichées : produits Cardmarket, ou cartes regroupées. */
  source: "rows" | "cards"
  /** Colonne triée à l'arrivée sur le mode, quand le tri courant n'y existe pas. */
  defaultSort: string
  /** Ce que « coté » veut dire ici. Alimente la colonne masquée `priced`. */
  priced: (r: { hasPrice: boolean; hasPriceF: boolean }) => boolean
}

export const MODES = {
  normal: {
    label: "Normal",
    noun: "produits",
    source: "rows",
    defaultSort: "low",
    priced: (r) => r.hasPrice,
  },
  foil: {
    label: "Foil",
    noun: "produits",
    source: "rows",
    defaultSort: "lowF",
    priced: (r) => r.hasPriceF,
  },
  card: {
    label: "Par carte",
    noun: "cartes",
    source: "cards",
    defaultSort: "bestLow",
    priced: (r) => r.hasPrice,
  },
} as const satisfies Record<string, ModeConfig>

export type Mode = keyof typeof MODES

/** Ordre des onglets. */
export const MODE_IDS = Object.keys(MODES) as Mode[]
