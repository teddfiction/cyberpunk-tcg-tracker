/**
 * Types partagés : modèle Cardmarket, lignes de table, et augmentation des
 * métadonnées TanStack (mode courant, alignement, formatage CSV).
 */
import type { RowData } from "@tanstack/react-table"

import type { Mode } from "@/lib/modes"

/** Un produit du catalogue Cardmarket (single ou scellé). */
export type Product = {
  id: number
  name: string
  exp: number
  cat: string
  /** idMetacard : regroupe les impressions d'une même carte. 0 pour le scellé. */
  mc: number
}

/** Les cotes d'un produit, telles que publiées dans le price guide. */
export type Price = {
  avg: number | null
  low: number | null
  trend: number | null
  avgF: number | null
  lowF: number | null
  /** 1 si le produit a un bloc foil dans l'export. */
  foil: number
}

/** Code d'impression d'une extension. `sure` distingue le confirmé du déduit. */
export type CodeEntry = { code: string; sure: boolean }
export type CodeMap = Record<string, CodeEntry>

/** Une impression telle que la renvoie l'API Netdeck. */
export type Printing = {
  uuid: string | null
  set: string | null
  setCode: string | null
  number: string | null
  rarity: string | null
  artist: string | null
  /** Miniature webp en base64, présente seulement si le script a tourné avec --images. */
  thumb?: string
}

export type EnrichedCard = {
  name: string
  slug: string | null
  type?: string | null
  color?: string | null
  cost?: number | null
  power?: number | null
  ram?: number | null
  printings: Printing[]
}

export type Dataset = {
  catalog: Product[]
  prices: Record<string, Price>
  pricesAt: string
  catalogAt: string
}

/** Une ligne de la table : produit + cotes + dérivés + enrichissement. */
export type Row = Product &
  Partial<Price> & {
    expName: string
    code: string
    /** Écart tendance / prix mini, en %. */
    d: number | null
    /** Écart moyenne foil / mini foil, en %. */
    df: number | null
    num: string | null
    rarity: string | null
    thumb: string | null
    slug: string | null
    uuid: string | null
    hasPrice: boolean
    hasPriceF: boolean
    single: boolean
  }

/** Une carte, toutes impressions confondues (vue « Par carte »). */
export type CardRow = {
  mc: number
  name: string
  rows: Row[]
  nExp: number
  exps: number[]
  expName: string
  code: string
  prints: { exp: number }[]
  bestLow: number | null
  bestTrend: number | null
  bestLowF: number | null
  hasPrice: boolean
  hasPriceF: boolean
  single: boolean
  id: number
  thumb: string | null
}

/** Ce que la table manipule : une ligne produit, ou une ligne carte. */
export type TableRow = Row | CardRow

/**
 * Accès indifférencié aux champs des deux formes. Réservé aux `cell` et au CSV,
 * qui rendent un produit ou une carte sans avoir à distinguer les deux.
 */
export type AnyRow = Row & CardRow

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    mode: Mode
    codes: CodeMap
    expansions: Record<string, string>
  }

  interface ColumnMeta<TData extends RowData, TValue> {
    /** Colonne numérique : alignée à droite, chiffres tabulaires. */
    align?: "right"
    /** Classes ajoutées à la cellule (largeurs contraintes de la colonne Produit). */
    className?: string
    /** Décimal → virgule française à l'export CSV. */
    decimal?: boolean
    /** Rendu CSV quand la valeur brute de la colonne ne suffit pas. */
    csv?: (row: AnyRow, codes: CodeMap) => string
  }
}
