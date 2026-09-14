import type { Col, Mode } from "@/types"

/**
 * `avg1`, `avg7`, `avg30` et leurs équivalents foil ne sont pas listés :
 * Cardmarket les publie systématiquement vides. `trend-foil` vaut 0 partout.
 */
export const COLUMNS: Record<Mode, Col[]> = {
  normal: [
    { k: "name", l: "Produit", t: "name" },
    { k: "code", l: "Code", t: "code" },
    { k: "expName", l: "Extension", t: "exp" },
    { k: "avg", l: "Moyenne", t: "eur" },
    { k: "low", l: "Mini", t: "eur" },
    { k: "trend", l: "Tendance", t: "eur" },
    { k: "d", l: "Δ tend./mini", t: "pct" },
    { k: "id", l: "ID", t: "id" },
  ],
  foil: [
    { k: "name", l: "Produit", t: "name" },
    { k: "code", l: "Code", t: "code" },
    { k: "expName", l: "Extension", t: "exp" },
    { k: "avgF", l: "Moyenne foil", t: "eur" },
    { k: "lowF", l: "Mini foil", t: "eur" },
    { k: "df", l: "Δ moy./mini", t: "pct" },
    { k: "id", l: "ID", t: "id" },
  ],
  card: [
    { k: "name", l: "Carte", t: "name" },
    { k: "nExp", l: "Impressions", t: "prints" },
    { k: "bestLow", l: "Mini le moins cher", t: "eur" },
    { k: "bestTrend", l: "Tendance mini", t: "eur" },
    { k: "bestLowF", l: "Mini foil", t: "eur" },
  ],
}

const NUMBER_COLUMN: Col = { k: "num", l: "N°", t: "num" }

/** La colonne N° n'apparaît qu'une fois l'enrichissement Netdeck chargé. */
export function columnsFor(mode: Mode, enriched: boolean): Col[] {
  const base = COLUMNS[mode]
  if (!enriched || mode === "card") return base
  const i = base.findIndex((c) => c.k === "code")
  return [...base.slice(0, i + 1), NUMBER_COLUMN, ...base.slice(i + 1)]
}

export const isTextColumn = (t: Col["t"]) =>
  t === "name" || t === "exp" || t === "code" || t === "num" || t === "prints"

/** Tri par défaut quand on change de mode et que la colonne courante disparaît. */
export const defaultSortKey = (mode: Mode) =>
  mode === "foil" ? "lowF" : mode === "card" ? "bestLow" : "low"
