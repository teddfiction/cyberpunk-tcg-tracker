# CLAUDE.md

Consultation des cotes Cardmarket du **Cyberpunk TCG (WeirdCo)** : table de données
avec recherche, filtres, tri, regroupement par carte, export CSV.
React 19 · TypeScript · Vite 7 · Tailwind v4 · shadcn/ui (Radix) · TanStack Table v8.

Le `README.md` documente le produit et les sources de données en détail — le lire avant
de toucher au pipeline. Ce fichier ne couvre que ce qu'il faut savoir pour coder ici.

## Commandes

```bash
npm run dev              # vite, port 5173, ouvre le navigateur
npm run build            # tsc -b && vite build → dist/
npm run typecheck        # tsc -b --noEmit  ← à lancer après toute modif TS
npm run data:fetch       # télécharge les trois exports → data/cardmarket/
npm run data:cardmarket  # data/cardmarket/*.json → src/data/dataset.json
npm run data:refresh     # data:fetch + data:cardmarket, le rafraîchissement courant
npm run data:netdeck     # api.netdeck.gg → cards_enriched.json (Node, pas navigateur)
```

Pas de tests, pas de linter, pas de CI. `npm run typecheck` est le seul filet :
`strict`, `noUnusedLocals`, `noUnusedParameters` sont actifs.

`npm run dev` suffit pour travailler sur l'app : `src/data/dataset.json` est
versionné et fait office d'amorce. Les scripts `data:*` ne servent qu'à rafraîchir
les données — `data:cardmarket` seul exige que `data/cardmarket/` soit déjà rempli
(dossier non versionné), d'où `data:refresh` qui enchaîne les deux.
**Procédure complète : README § « Exploiter l'app ».** Ne pas la dupliquer ici.

## Architecture — la règle de découpage

Trois couches, dans cet ordre de dépendance. Ne pas la casser :

| Couche | Rôle | Contrainte |
|---|---|---|
| `src/lib/` | fonctions pures | ni React, ni JSX, ni DOM — testable sans navigateur |
| `src/hooks/` | état | porte l'état, appelle `lib/`, ne rend rien |
| `src/components/` | rendu | pas de logique métier, reçoit tout par props |

Conséquence pratique : une nouvelle transformation (tri, jointure, agrégat) va dans
`lib/`, pas dans un composant ni dans un `useMemo` d'un hook.

Une seule nuance : `components/columns.tsx` mélange configuration et rendu, parce
qu'une `ColumnDef` TanStack contient ses `cell`. Les définitions sont donc dans
`components/`, et la sémantique pure qu'elles référencent (tri, filtres) reste
dans `lib/table.ts`. `hooks/use-table.ts` reçoit les colonnes en argument : sans
ça, un hook importerait un composant.

`src/types.ts` centralise **tous** les types partagés, y compris l'augmentation des
métadonnées TanStack. Les types locaux à un composant (`Props`) restent dans le fichier.

### Flux de données

```
src/data/dataset.json  ──┐
src/data/expansions.ts ──┼─► useDataset ─► buildRows ─► buildCards ──┐
imports JSON (mémoire) ──┘        ▲                                  │
                              enrich.ts                              ▼
                        (jointure Netdeck)          useTable ─► DataTable / toCsv
                                                       ▲
                                              columnsFor(mode, enriched)
```

- `useDataset` est la **source de vérité des données**. Tout passe par lui.
- Les imports remplacent l'état **en mémoire uniquement** — aucune persistance.
  Recharger la page revient au `dataset.json` embarqué. C'est voulu.
- `codes` (codes d'impression) est le seul état éditable depuis l'UI, non persisté :
  Paramètres → « Copier le mapping JSON » → reporter dans `src/data/expansions.ts`.

## La table (TanStack Table v8)

**Version épinglée à `8.21.3`, pas la 9.** La v9 est publiée en `latest` mais change
toute l'API (`useTable`, `createSortedRowModel`, features à composer). La recette
data-table officielle de shadcn est écrite pour la v8 : rester en v8, c'est pouvoir
copier-coller depuis la doc shadcn sans traduction. Migrer en v9 est un chantier à
part entière, pas un `npm update`.

Règles à connaître avant de toucher à la table :

- **TanStack détient l'état de la table** — tri, filtres de colonnes, recherche.
  `FiltersBar` lit et écrit directement dans l'instance (`table.setGlobalFilter`,
  `table.getColumn("exps")?.setFilterValue`). Ne pas réintroduire de copie React
  de cet état : c'est ce qu'on vient de supprimer.
- **Valeurs manquantes.** Les accesseurs numériques renvoient `undefined`, jamais
  `null`, et les colonnes portent `sortUndefined: "last"`. TanStack traite ce cas
  *avant* d'inverser pour le tri descendant : les lignes sans cote restent en bas
  dans les deux sens. Renvoyer `null` casserait silencieusement ce comportement.
- **Ex æquo.** `buildRows` et `buildCards` trient par nom avec la collation
  française. À valeur égale, TanStack retombe sur l'index d'origine, donc sur ce
  tri-là. Il n'y a pas de comparateur secondaire à écrire.
- **Colonnes masquées.** `exps`, `priced` et `single` existent uniquement pour
  porter les filtres de la barre. `HIDDEN_COLUMNS` (`lib/table.ts`) les sort du
  rendu, et donc du CSV.
- **Recherche.** `enableGlobalFilter` n'est vrai que sur la première colonne :
  sinon TanStack rejouerait le même prédicat sur chaque colonne de chaque ligne.
- **Changement de mode.** Il peut faire disparaître la colonne triée. `use-table.ts`
  filtre le tri sur les colonnes existantes et retombe sur `defaultSortId(mode)` —
  par dérivation, pas par effet.

**Ajouter une colonne** : la déclarer dans `components/columns.tsx` avec son `meta`
(`align` pour l'alignement, `decimal` pour la virgule française au CSV, `csv` quand
la valeur brute ne suffit pas). L'export CSV et le rendu suivent automatiquement,
il n'y a rien d'autre à câbler.

## Conventions de code

- **En-tête de fichier obligatoire.** Chaque fichier du projet commence par un bloc
  `/** … */` de une à trois lignes disant ce qu'il fait — et, quand c'est utile,
  pourquoi il est écrit comme ça. Seule exception : les fichiers du registry
  shadcn (voir plus bas), laissés intacts.
- **Pas de point-virgule**, guillemets doubles, indentation 2 espaces.
- Alias `@/` → `src/` (déclaré dans `tsconfig.json` **et** `vite.config.ts` : modifier les deux).
- Exports nommés partout, sauf `App.tsx` (default).
- React : `import * as React from "react"`, `React.useState`, jamais d'import nommé de hook.
- Ordre des imports : externes → `@/components/ui` → `@/components` → `@/data` → `@/hooks` → `@/lib` → `import type { … } from "@/types"` en dernier.
- Nommage court et dense côté données (`mc`, `exp`, `avgF`, `d`, `df`) — c'est assumé,
  chaque champ est documenté dans `src/types.ts`. Ne pas renommer sans raison.
- **Commentaires et UI en français.** Les commentaires expliquent *pourquoi*, pas *quoi* :
  ils portent les décisions et les pièges des données. Les conserver lors d'un refactor.

## shadcn/ui, Radix et Tailwind

La consigne du projet : **uniquement Tailwind et les composants shadcn natifs.**
Concrètement :

- **Fichiers du registry non modifiés** : `src/components/ui/**` et
  `src/hooks/use-mobile.ts` (ajouté par `shadcn add sidebar`). Ils doivent rester
  régénérables à l'identique par la CLI — donc pas d'édition, **pas même un
  commentaire d'en-tête**. Pour un nouveau composant :
  `npx shadcn@latest add <nom>`, jamais écrit à la main. Toute personnalisation
  vit dans `src/components/`.
- **Radix exclusivement.** Le `Combobox` du registry dépend de `@base-ui/react` :
  `extension-combobox.tsx` le reconstruit avec `Popover` + `Command` + `Badge`,
  qui sont eux aussi des composants shadcn natifs. Ne pas introduire
  `@base-ui/react` — ce serait une seconde bibliothèque de primitives pour un
  filtre à douze entrées (voir README § « Note sur le combobox »).
- **Élément brut ou composant shadcn ?** Le composant quand il raccourcit le code
  (`Button variant="ghost"` pour les en-têtes triables). L'élément brut quand le
  composant imposerait une cascade d'overrides pour le neutraliser (les tuiles de
  `StatsStrip`, qui partagent une bordure de grille qu'une `Card` casserait).
- **Aucune couleur en dur.** Toujours les tokens : `bg-card`, `text-muted-foreground`,
  `text-destructive`. Ils vivent dans les blocs `:root` / `.dark` de `src/index.css`.
  Thème : base **Mist**, accent **Yellow**, `--radius: 0`, police **Geist** (locale).
- Sombre/clair : classe `.dark` sur `<html>` pilotée par `use-theme.ts` (localStorage `cptcg-theme`).

## Pièges spécifiques aux données

Ces contraintes ne sont pas des bugs. Ne pas « réparer » :

- **Colonnes absentes.** `avg1`, `avg7`, `avg30` et leurs variantes foil sont vides à 100 %
  dans l'export Cardmarket, `trend-foil` vaut 0 partout. Volontairement non déclarées
  (`src/components/columns.tsx`).
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

## Versionnement

Dépôt git sur `main`. Ce qui est suivi, et ce qui ne l'est pas :

| Chemin | Suivi | Pourquoi |
|---|---|---|
| `src/data/dataset.json` | **oui** | dérivé qui fait foi, amorce de l'app — le committer après chaque `npm run data:cardmarket` |
| `src/data/expansions.ts` | **oui** | libellés et codes d'impression saisis à la main, seule mémoire de ce travail |
| `data/cardmarket/` | non | exports bruts republiés quotidiennement, retéléchargeables — diffs illisibles |
| `cards_enriched.json`, `netdeck-raw.json` | non | sorties de scripts, régénérables |
| visuels de cartes | non | licence CD PROJEKT RED, usage local, pas de redistribution |

Conséquence pour un clone frais : l'app démarre telle quelle ; `npm run data:refresh`
reconstitue `data/cardmarket/` puis régénère le dérivé.
