/**
 * Couleurs de carte du jeu (Red, Yellow, Green, Blue) et le token CSS qui porte
 * chacune. Les valeurs vivent dans `src/index.css`, réglées par thème : une
 * teinte lisible sur un fond clair ne l'est pas sur le noir.
 *
 * Ce ne sont pas des tons d'interface — elles viennent des données et rien ne
 * doit les remplacer — mais elles suivent la même règle : aucune couleur écrite
 * dans un composant.
 */
import { norm } from "@/lib/format"

const VARS: Record<string, string> = {
  red: "var(--card-red)",
  yellow: "var(--card-yellow)",
  green: "var(--card-green)",
  blue: "var(--card-blue)",
}

/** Le token d'une couleur, ou `null` si Netdeck en renvoie une qu'on ne connaît pas. */
export const colorVar = (color: string | null | undefined): string | null =>
  (color && VARS[norm(color)]) || null
