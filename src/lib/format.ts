/** Formatage et normalisation. Aucune dépendance React : testable isolément. */

export const eur = (n: number | null | undefined) =>
  n == null
    ? null
    : n.toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })

export const pct = (n: number) =>
  (n > 0 ? "+" : "") + n.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %"

export const dateFr = (s: string) =>
  new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

export const dateShort = (s: string) => new Date(s).toLocaleDateString("fr-FR")

/**
 * Clé de rapprochement entre sources : minuscules, sans accents ni ponctuation.
 * Rend « V - Streetkid » (Cardmarket) et « V: Streetkid » (Netdeck) identiques,
 * et reproduit exactement le `set.code` renvoyé par l'API Netdeck.
 */
export const norm = (s: string) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

export const minOf = (values: (number | null | undefined)[]) => {
  const v = values.filter((x): x is number => x != null)
  return v.length ? Math.min(...v) : null
}

/**
 * Découpe en mots comparables : minuscules, sans accents, toute ponctuation
 * traitée en séparateur. Sert à la recherche — contrairement à `norm()`, qui
 * colle tout, les frontières de mots sont conservées. C'est ce qui évite qu'une
 * requête s'apparie à cheval sur deux champs.
 */
export const words = (s: string) =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
