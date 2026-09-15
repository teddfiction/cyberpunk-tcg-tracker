/**
 * Les trois exports publics Cardmarket : une seule source d'URL pour le script
 * de téléchargement, le relais du serveur de dev et le bouton d'actualisation.
 *
 * Avant, l'adresse vivait dans `scripts/fetch-cardmarket.mjs`, dans un
 * commentaire de `build-dataset.mjs` et dans `vite.config.ts` — trois endroits
 * à corriger le jour où Cardmarket déplace un fichier.
 */

export const CARDMARKET_BASE = "https://downloads.s3.cardmarket.com/productCatalog"

/** Préfixe que le relais de `vite.config.ts` réécrit vers `CARDMARKET_BASE`. */
export const CARDMARKET_PROXY = "/cardmarket"

/**
 * Ordre volontaire : les catalogues d'abord, le price guide ensuite. `describe`
 * compte les produits sans cote en s'appuyant sur le catalogue déjà chargé.
 */
export const CARDMARKET_FILES = [
  { path: "productList/products_singles_23.json", name: "products_singles_23.json" },
  { path: "productList/products_nonsingles_23.json", name: "products_nonsingles_23.json" },
  { path: "priceGuide/price_guide_23.json", name: "price_guide_23.json" },
] as const

export type CardmarketFile = (typeof CARDMARKET_FILES)[number]
