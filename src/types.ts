/**
 * Types partagés : modèle Cardmarket, lignes de table, et augmentation des
 * métadonnées TanStack (mode courant, alignement, formatage CSV).
 */
import type { RowData } from "@tanstack/react-table"

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
    /** Rareté de l'impression, seulement quand l'appariement est certain. */
    rarity: string | null
    /**
     * Raretés possibles quand les impressions connues ne s'accordent pas.
     * Vide si `rarity` est connue.
     */
    rarities: string[]
    /**
     * Nombre de produits Cardmarket partageant ce nom dans cette extension.
     * Au-delà de 1, ce sont des versions que Cardmarket ne distingue que par
     * leur `idProduct` — la rareté reste celle de la carte, mais on ne sait pas
     * quelle version physique on regarde.
     */
    variants: number
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

/**
 * Une ligne de la base de cartes : une impression Netdeck, enrichie de la cote
 * Cardmarket quand celle-ci est attribuable.
 */
export type PrintRow = {
  /** uuid de l'impression — unique sur les 502, sert de clé de ligne. */
  uuid: string
  name: string
  slug: string | null
  /** Nom du set chez Netdeck : la source officielle, y compris hors Cardmarket. */
  set: string
  /** idExpansion Cardmarket correspondant, `null` si ce set n'y existe pas. */
  exp: string | null
  code: string
  num: string | null
  rarity: string | null
  artist: string | null
  thumb: string | null
  type: string | null
  color: string | null
  cost: number | null
  power: number | null
  ram: number | null
  /** Cote mini Cardmarket, quand un seul produit correspond à cette impression. */
  low: number | null
  /** Fourchette des cotes quand plusieurs produits partagent ce nom dans l'extension. */
  lowRange: [number, number] | null
  /** Nombre de produits Cardmarket indistinguables pour cette carte ici. */
  variants: number
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
    csv?: (row: TData, codes: CodeMap) => string
    /** Colonne purement visuelle : absente de l'export CSV. */
    noCsv?: boolean
  }
}
