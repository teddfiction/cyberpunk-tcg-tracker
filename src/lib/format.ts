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

/** « 1 version », « 3 versions ». Mots réguliers seulement : un « s » ajouté au-delà de 1. */
export const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`

export const pct = (n: number) =>
  (n > 0 ? "+" : "") + n.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %"

export const dateFr = (s: string) =>
  new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

export const dateShort = (s: string) => new Date(s).toLocaleDateString("fr-FR")

/**
 * Mois abrégé : « 15 sept. 2026 ». Un seul format pour les deux dates de
 * l'en-tête, prix et catalogue.
 */
export const dateAbbr = (s: string) =>
  new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })

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

/**
 * Découpe un compte rendu en phrases, une par ligne.
 *
 * Les avis d'import concatènent désormais jusqu'à quatre comptes rendus — trois
 * fichiers plus un éventuel avertissement de stockage — et se lisaient en un
 * seul pavé.
 *
 * La coupure demande une fin de phrase **suivie d'un début de phrase** : un
 * point, une espace, puis une majuscule ou un chiffre. C'est ce qui protège les
 * noms de fichiers, où le point est suivi d'une minuscule ou d'une ponctuation
 * — « price_guide_23.json (export du… » et « cards_enriched.json : 502… »
 * restent d'un seul tenant.
 */
export const sentences = (text: string): string[] =>
  String(text)
    .split(/(?<=\.)\s+(?=[A-ZÀ-ÝŒ0-9])/)
    .map((s) => s.trim())
    .filter(Boolean)
