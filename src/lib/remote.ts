/**
 * Récupération à chaud du price guide Cardmarket, pour le bouton
 * « Actualiser les prix ».
 *
 * L'export ne renvoie aucun en-tête CORS — un `fetch` direct depuis la page
 * échoue, et `no-cors` ne rend qu'une réponse opaque illisible. L'appel passe
 * donc par le relais déclaré dans `vite.config.ts`, qui le rend same-origin.
 *
 * Le résultat est rendu sous forme de `File`, pour repartir dans `importFiles`
 * comme un fichier choisi à la main : parse, compte rendu, persistance et avis
 * restent un seul et même chemin.
 */
import { IngestError } from "@/lib/ingest"

/** Même fichier que `npm run data:fetch`, servi par le relais du serveur de dev. */
export const PRICE_GUIDE_PATH = "/cardmarket/priceGuide/price_guide_23.json"
export const PRICE_GUIDE_NAME = "price_guide_23.json"

export async function fetchPriceGuide(): Promise<File> {
  let res: Response
  try {
    res = await fetch(PRICE_GUIDE_PATH, { cache: "no-store" })
  } catch {
    throw new IngestError(
      "Cardmarket injoignable : vérifier la connexion. Le téléchargement passe par le serveur de dev."
    )
  }

  if (!res.ok) {
    throw new IngestError(`Cardmarket a répondu ${res.status}. Réessayer plus tard.`)
  }

  const body = await res.text()

  // Même garde que scripts/fetch-cardmarket.mjs : un portail captif, une page
  // d'erreur, ou un `dist/` servi sans relais renvoient du HTML avec un 200.
  // Sans ça l'échec se manifesterait bien plus loin, avec un message opaque.
  try {
    JSON.parse(body)
  } catch {
    throw new IngestError(
      "Réponse non-JSON : le relais de téléchargement est absent. Ce bouton exige `npm run dev` " +
        "ou `npm run preview` — un build servi en statique n'a personne pour contourner le CORS."
    )
  }

  return new File([body], PRICE_GUIDE_NAME, { type: "application/json" })
}
