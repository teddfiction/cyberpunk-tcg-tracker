/**
 * Registre des vues de l'app.
 *
 * Ajouter une vue : une entrée ici, puis son icône dans `app-sidebar.tsx` et
 * son rendu dans `App.tsx`. Les deux sont des `Record<View, …>` : le
 * compilateur réclame ce qui manque, il n'y a rien d'autre à chercher.
 */

export type ViewConfig = {
  label: string
  /** Deuxième ligne du menu, quand elle éclaire ce que la vue contient. */
  hint?: string
}

export const VIEWS = {
  table: { label: "Cotes Cardmarket", hint: "Catalogue et prix" },
  netdeck: { label: "Base de cartes", hint: "Impressions Netdeck" },
  collection: { label: "Collection", hint: "Versions possédées" },
  settings: { label: "Paramètres" },
} as const satisfies Record<string, ViewConfig>

export type View = keyof typeof VIEWS

/** Ordre du menu. */
export const VIEW_IDS = Object.keys(VIEWS) as View[]
