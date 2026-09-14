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

export type Mode = "normal" | "foil" | "card"
export type SortDir = "asc" | "desc"
export type SortState = { k: string; dir: SortDir }

export type ColType = "name" | "code" | "num" | "exp" | "prints" | "eur" | "pct" | "int" | "id"
export type Col = { k: string; l: string; t: ColType }

export type Filters = {
  q: string
  mode: Mode
  exps: string[]
  hideEmpty: boolean
  onlySingles: boolean
  sort: SortState
}

export type ImportResult = { ok: boolean; message: string }
