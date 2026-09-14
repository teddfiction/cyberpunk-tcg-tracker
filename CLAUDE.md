# CLAUDE.md

Consultation des cotes Cardmarket du **Cyberpunk TCG (WeirdCo)** : table de données
avec recherche, filtres, tri, regroupement par carte, export CSV.
React 19 · TypeScript · Vite 7 · Tailwind v4 · shadcn/ui (Radix).

Le `README.md` documente le produit et les sources de données en détail — le lire avant
de toucher au pipeline. Ce fichier ne couvre que ce qu'il faut savoir pour coder ici.

## Commandes

```bash
npm run dev              # vite, port 5173, ouvre le navigateur
npm run build            # tsc -b && vite build → dist/
npm run typecheck        # tsc -b --noEmit  ← à lancer après toute modif TS
npm run data:cardmarket  # data/cardmarket/*.json → src/data/dataset.json
npm run data:netdeck     # api.netdeck.gg → cards_enriched.json (Node, pas navigateur)
```

Pas de tests, pas de linter, pas de CI. `npm run typecheck` est le seul filet :
`strict`, `noUnusedLocals`, `noUnusedParameters` sont actifs.

## Architecture — la règle de découpage

Trois couches, dans cet ordre de dépendance. Ne pas la casser :

| Couche | Rôle | Contrainte |
|---|---|---|
| `src/lib/` | fonctions pures | aucun import React, aucun accès DOM, testable isolément |
| `src/hooks/` | état | porte l'état, appelle `lib/`, ne rend rien |
| `src/components/` | rendu | pas de logique métier, reçoit tout par props |

Conséquence pratique : une nouvelle transformation (tri, jointure, agrégat) va dans
`lib/`, pas dans un composant ni dans un `useMemo` d'un hook.

`src/types.ts` centralise **tous** les types partagés. Les types locaux à un composant
(`Props`) restent dans le fichier.

### Flux de données

```
src/data/dataset.json  ──┐
src/data/expansions.ts ──┼─► useDataset ─► buildRows ─► buildCards ─► selectRows ─► DataTable
imports JSON (mémoire) ──┘                    ▲
                                          enrich.ts (jointure Netdeck)
```

- `useDataset` est la **source de vérité unique**. Tout passe par lui.
- `useFilters` détient filtres/tri/colonnes ; `selectRows` filtre puis trie.
- Les imports remplacent l'état **en mémoire uniquement** — aucune persistance.
  Recharger la page revient au `dataset.json` embarqué. C'est voulu.
- `codes` (codes d'impression) est le seul état éditable depuis l'UI, non persisté :
  Paramètres → « Copier le mapping JSON » → reporter dans `src/data/expansions.ts`.

## Conventions de code

- **Pas de point-virgule**, guillemets doubles, indentation 2 espaces.
- Alias `@/` → `src/` (déclaré dans `tsconfig.json` **et** `vite.config.ts` : modifier les deux).
- Exports nommés partout, sauf `App.tsx` (default).
- React : `import * as React from "react"`, `React.useState`, jamais d'import nommé de hook.
- Ordre des imports : externes → `@/components/ui` → `@/components` → `@/data` → `@/hooks` → `@/lib` → `import type { … } from "@/types"` en dernier.
- Nommage court et dense côté données (`mc`, `exp`, `avgF`, `d`, `df`) — c'est assumé,
  chaque champ est documenté dans `src/types.ts`. Ne pas renommer sans raison.
- **Commentaires et UI en français.** Les commentaires expliquent *pourquoi*, pas *quoi* :
  ils portent les décisions et les pièges des données. Les conserver lors d'un refactor.

## shadcn/ui, Radix et thème

- `src/components/ui/` = registry **new-york-v4**, fichiers **non modifiés**.
  Pour un nouveau composant : `npx shadcn@latest add <nom>`, ne pas écrire à la main.
  Toute personnalisation se fait dans `src/components/`, pas dans `ui/`.
- **Radix exclusivement.** Le `Combobox` du registry dépend de `@base-ui/react` :
  il est réimplémenté dans `extension-combobox.tsx` avec `Popover` + `Command` + `Badge`.
  Ne pas introduire `@base-ui/react` sans discussion (voir README § « Note sur le combobox »).
- Thème : base **Mist**, accent **Yellow**, `--radius: 0`, police **Geist** (locale, `public/fonts/`).
  Les tokens OKLCH vivent uniquement dans les blocs `:root` / `.dark` de `src/index.css`.
  **Aucune couleur en dur** dans les composants — toujours `bg-card`, `text-muted-foreground`, etc.
- Sombre/clair : classe `.dark` sur `<html>` pilotée par `use-theme.ts` (localStorage `cptcg-theme`).

## Pièges spécifiques aux données

Ces contraintes ne sont pas des bugs. Ne pas « réparer » :

- **Colonnes absentes.** `avg1`, `avg7`, `avg30` et leurs variantes foil sont vides à 100 %
  dans l'export Cardmarket, `trend-foil` vaut 0 partout. Volontairement non affichées
  (`src/lib/columns.ts`).
- **`low` ≠ prix de vente.** C'est la plus petite annonce. Sur un marché à trois annonces,
  c'est du bruit. `trend` est plus honnête. La somme des `low` n'est pas une valorisation —
  le libellé de `StatsStrip` doit rester prudent.
- **Ni numéro de collecteur ni rareté côté Cardmarket.** Ils viennent de l'enrichissement
  Netdeck. La colonne « N° » n'apparaît qu'une fois `cards_enriched.json` importé.
- **Jointure Netdeck ↔ Cardmarket** (`lib/enrich.ts`) : clé `norm(nom)|idExpansion`, repli
  sur le nom seul **uniquement si la carte n'a qu'une impression connue**. Ce garde-fou
  évite d'attribuer le mauvais numéro aux cartes réimprimées — ne pas l'assouplir.
- **`norm()`** (`lib/format.ts`) est la clé de rapprochement entre toutes les sources et
  reproduit exactement le `set.code` de l'API Netdeck. Toute modification casse la jointure.
- **Codes d'impression** (MS01B, SD02B…) : n'existent dans aucune source. Seuls MS01B et
  SD02B sont confirmés (`sure: true`), le reste est déduit et affiché en pointillés.
- **Extensions 6717 et 6719** : aucun produit scellé associé, nom inconnu.
- **CORS Netdeck** : `api.netdeck.gg` restreint l'origine à `https://cyberpunktcg.com`.
  L'appel doit rester dans un script Node avec en-tête `Origin` — jamais depuis le navigateur.
- **Export CSV** (`lib/csv.ts`) : séparateur `;`, virgule décimale, BOM UTF-8. C'est ce qui
  permet à Excel FR d'ouvrir le fichier sans assistant d'import. Ne pas « normaliser » en RFC 4180.

## État du dépôt

- **Pas de dépôt git initialisé** (`git log` échoue). Un `.gitignore` existe déjà.
- Résidu à supprimer : le dossier vide `src/{components/ui,lib,hooks,data}` — accident
  d'expansion de brace shell, sans rapport avec le code.
- Les sorties de scripts (`cards_enriched.json`, `netdeck-raw.json`) sont ignorées :
  ne pas les committer, ni les visuels de cartes (licence CD PROJEKT RED, usage local).
