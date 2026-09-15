/**
 * Table des extensions Cardmarket : libellés, codes d'impression et URLs
 * externes. Tout ce qu'aucune source ne publie et qui a dû être reconstruit.
 */
import type { CodeMap } from "@/types"

/**
 * Libellés des extensions Cardmarket.
 *
 * Les exports Cardmarket ne contiennent que des `idExpansion`. Ces noms ont été
 * reconstruits en croisant les produits scellés avec leur idExpansion : un
 * « Welcome to Night City - Beta Booster Box » en 6714 nomme l'extension 6714.
 * 6717 et 6719 n'avaient aucun produit scellé : leurs noms viennent du
 * recoupement avec l'export Netdeck du 15/09/2026, par intersection des noms de
 * cartes. 6719 = « Set 1 Promos » (2 cartes sur 2, certain). 6717 = « Box
 * Toppers », 6 cartes sur 6 — la variante Beta plutôt que Retail est déduite de
 * sa place dans la série d'identifiants, pas confirmée.
 */
export const EXPANSIONS: Record<string, string> = {
  "6714": "Welcome to Night City — Beta",
  "6715": "The Heist — Beta Starter Deck",
  "6716": "Embracing Power — Beta Starter Deck",
  "6717": "Box Toppers — Beta",
  "6718": "Pre-Release Beta Kit",
  "6719": "Set 1 Promos",
  "6720": "The Heist — Demo Deck",
  "6721": "Embracing Power — Demo Deck",
  "6722": "Alpha Kit",
  "6761": "Welcome to Night City — Retail",
  "6762": "The Heist — Retail Starter Deck",
  "6763": "Embracing Power — Retail Starter Deck",
}

/**
 * Codes d'impression par extension.
 *
 * `sure: true` = confirmé par une source externe. `sure: false` = déduction,
 * affichée en pointillés dans l'interface et modifiable dans Paramètres.
 *
 * MS01B et SD02B sont confirmés. SD01B suit de la numérotation d'Embracing
 * Power en 02 et de l'ordre des produits dans les exports. Les codes Retail
 * supposent que le suffixe B marque la Beta et disparaît au retail. DD01B,
 * DD02B et MS01A sont des conjectures.
 */
export const DEFAULT_CODES: CodeMap = {
  "6714": { code: "MS01B", sure: true },
  "6716": { code: "SD02B", sure: true },
  "6715": { code: "SD01B", sure: false },
  "6717": { code: "", sure: false },
  "6718": { code: "", sure: false },
  "6719": { code: "", sure: false },
  "6720": { code: "DD01B", sure: false },
  "6721": { code: "DD02B", sure: false },
  "6722": { code: "MS01A", sure: false },
  "6761": { code: "MS01", sure: false },
  "6762": { code: "SD01", sure: false },
  "6763": { code: "SD02", sure: false },
}

/**
 * Sets Netdeck dont le nom ne ressemble pas à celui de l'extension Cardmarket
 * correspondante — l'appariement par libellé ne peut rien pour eux.
 *
 * Établi par intersection des noms de cartes sur l'export du 15/09/2026, et
 * cohérent sur le fond : le deck de démo « Embracing Power » est le deck
 * Arasaka, celui de « The Heist » est le deck Merc. Les deux recoupements sont
 * à 100 % (14/14 et 15/15).
 *
 * Clé : nom du set normalisé par `norm()`. Valeur : idExpansion Cardmarket.
 */
export const SET_ALIASES: Record<string, string> = {
  arasakademodeck: "6721",
  mercdemodeck: "6720",
}

/** Raccourcit les `categoryName` Cardmarket : « Cyberpunk Booster Boxes » → « Booster Box ». */
export function shortCategory(categoryName: string): string {
  const c = String(categoryName).replace("Cyberpunk ", "").replace("CPK ", "")
  return (
    {
      "Booster Boxes": "Booster Box",
      "Box Sets": "Box Set",
      "Starter Decks": "Starter Deck",
    }[c] ?? c
  )
}

/** Recherche Cardmarket par nom de produit. */
export const CARDMARKET_SEARCH = "https://www.cardmarket.com/fr/Cyberpunk/Products/Search?searchString="

/** Fiche d'une impression sur le site officiel. */
export const cyberpunkTcgUrl = (slug: string, printingUuid?: string | null) =>
  `https://cyberpunktcg.com/cards/${slug}${printingUuid ? `?printing=${printingUuid}` : ""}`
