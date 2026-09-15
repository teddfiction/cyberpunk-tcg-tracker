/**
 * Récupération à chaud des exports Cardmarket, pour le bouton
 * « Actualiser les données ».
 *
 * Les exports ne renvoient aucun en-tête CORS — un `fetch` direct depuis la
 * page échoue, et `no-cors` ne rend qu'une réponse opaque illisible. L'appel
 * passe donc par le relais déclaré dans `vite.config.ts`, qui le rend
 * same-origin.
 *
 * Le résultat est rendu sous forme de `File`, pour repartir dans `importFiles`
 * comme des fichiers choisis à la main : parse, compte rendu, persistance et
 * avis restent un seul et même chemin.
 */
import { CARDMARKET_FILES, CARDMARKET_PROXY, type CardmarketFile } from "@/data/cardmarket"
import { IngestError, expectJson } from "@/lib/ingest"

async function fetchOne({ path, name }: CardmarketFile): Promise<File> {
  let res: Response
  try {
    res = await fetch(`${CARDMARKET_PROXY}/${path}`, { cache: "no-store" })
  } catch {
    throw new IngestError(
      `${name} : Cardmarket injoignable. Vérifier la connexion — le téléchargement passe par le serveur de dev.`
    )
  }

  if (!res.ok) throw new IngestError(`${name} : Cardmarket a répondu ${res.status}. Réessayer plus tard.`)

  const body = await res.text()

  // Le cas vicieux : sans relais, un `dist/` servi en statique rend l'index
  // HTML avec un **200**. `expectJson` l'attrape ; on complète la cause, que
  // seul cet appelant connaît.
  try {
    expectJson(body, name)
  } catch {
    throw new IngestError(
      `${name} : réponse non-JSON — le relais de téléchargement est absent. Ce bouton exige ` +
        "`npm run dev` ou `npm run preview` ; un build servi en statique n'a personne pour contourner le CORS."
    )
  }

  return new File([body], name, { type: "application/json" })
}

/**
 * Les trois exports, ou rien. Un import partiel laisserait un catalogue et des
 * cotes de dates différentes, sans que l'utilisateur sache lequel manque.
 */
export const fetchCardmarket = (): Promise<File[]> => Promise.all(CARDMARKET_FILES.map(fetchOne))
