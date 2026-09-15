# CLAUDE.md

Consultation des cotes Cardmarket du **Cyberpunk TCG (WeirdCo)** : table de données
avec recherche, filtres, tri, regroupement par carte, export CSV.
React 19 · TypeScript · Vite 7 · Tailwind v4 · shadcn/ui (Radix) · TanStack Table v8 · Vitest.

Le `README.md` documente le produit et les sources de données. Ce fichier-ci sert à
**faire évoluer le code** : les recettes d'abord, les invariants ensuite.

## Commandes

```bash
npm run dev              # vite, port 5173
npm run test             # vitest, ~50 tests, < 1 s   ← le filet
npm run typecheck        # tsc -b --noEmit
npm run build            # tsc -b && vite build → dist/
npm run data:refresh     # rafraîchit les cotes (voir README § « Exploiter l'app »)
```

`npm run test && npm run typecheck` avant de considérer un changement terminé.
Pas de linter, pas de CI : ces deux commandes sont tout ce qu'il y a.

## Faire évoluer l'app

Le code est organisé pour qu'une évolution courante tienne dans **un seul fichier**,
et que le compilateur réclame le reste. Les recettes ci-dessous sont exhaustives :
s'il faut toucher à plus de fichiers que ce qui est listé, c'est le signe que la
structure ne couvre pas le besoin — mieux vaut la faire évoluer que la contourner.

### Ajouter une colonne

**Un fichier : `components/columns.tsx`.**

1. Écrire la `ColumnDef` — ou réutiliser les fabriques `money()` / `percent()`.
2. L'insérer dans l'entrée `VISIBLE[mode]` voulue.
3. Renseigner son `meta` : `align: "right"` pour un nombre, `decimal: true` pour la
   virgule française au CSV, `csv: (row, codes) => …` quand la valeur brute de la
   colonne n'est pas ce qu'on veut exporter.

Le rendu et l'export CSV suivent tout seuls — `toCsv` lit les colonnes visibles et
leur `meta`. Il n'y a rien à câbler ailleurs.

**Si la colonne peut être vide**, son accesseur doit renvoyer `undefined` (jamais
`null`) et la colonne porter `sortUndefined: "last"`. Voir « Invariants » plus bas.

### Ajouter un filtre

**Deux fichiers**, parce qu'un filtre a une donnée et une commande.

1. `components/columns.tsx` → une colonne **masquée** dans `filterColumns()` :
   un `accessorFn` qui expose la donnée à filtrer, un `filterFn`
   (`filterFlag` pour une case à cocher, `filterExpansions` pour une liste, ou
   une nouvelle fonction dans `lib/table.ts`).
2. `lib/table.ts` → ajouter son id à `HIDDEN_COLUMNS`, sinon la colonne s'affiche.
3. `components/filters-bar.tsx` → la commande. Pour une case à cocher, il suffit
   d'une entrée dans `FLAGS`.

Une case à cocher inactive doit poser `undefined`, pas `false` : TanStack ne garde
que les filtres actifs, et `resetColumnFilters()` s'appuie là-dessus.

### Ajouter un mode d'affichage

**Deux fichiers, et le compilateur indique le second.**

1. `lib/modes.ts` → une entrée dans `MODES` : libellé de l'onglet, nom des lignes
   pour le compteur, source (`rows` ou `cards`), tri par défaut, et ce que
   « coté » signifie dans ce mode.
2. `npm run typecheck` échoue alors sur `VISIBLE` dans `components/columns.tsx`,
   qui est un `Record<Mode, …>` : ajouter la liste de colonnes du mode.

C'est tout. Onglets, compteur, source de données et repli de tri se déduisent du
registre. `Mode` est dérivé de `MODES` (`keyof typeof MODES`) : il n'y a pas
d'union de chaînes à maintenir en parallèle.

### Ajouter une vue (à côté de Data table et Paramètres)

Aujourd'hui `App.tsx` fait un ternaire sur `view` et `app-sidebar.tsx` liste les
entrées de menu à la main — correct pour deux vues. **À la troisième**, faire comme
pour les modes : un `VIEWS` dans `lib/`, un `Record<View, …>` côté rendu. Ne pas
empiler les ternaires.

**Décision prise (sept. 2026) — la base de cartes Netdeck sera cette troisième
vue**, pas un remplacement de la table Cardmarket.

Le raisonnement, pour ne pas le re-débattre : l'entité qui compte pour la
collection est l'**impression** (uuid, set, numéro, rareté, visuel), pas l'annonce
Cardmarket ; une vue adossée à Netdeck montrerait enfin les cartes sans annonce,
aujourd'hui invisibles. Mais en faire la colonne vertébrale de l'app existante a
été écarté : **Netdeck n'a pas d'API publique** — la page for-developers annonce
l'accès direct en « Coming Soon » avec liste d'attente, et `embed.js` ne propose
qu'un `POST /cards/lookup` indexé par nom, soit la même clé lossy qu'aujourd'hui.
Ce que `scripts/netdeck-export.mjs` interroge est le backend privé de
cyberpunktcg.com, non versionné et sans conditions d'usage. En enrichissement
optionnel c'est acceptable — sans export, l'app tourne. En colonne vertébrale, un
changement de schéma viderait l'application.

Contraintes qui s'appliqueront à cette vue :

- **L'export Netdeck devient un artefact committé**, sur le modèle de
  `dataset.json` : le script tourne, on committe le résultat, l'app n'appelle
  jamais l'API au runtime.
- **Les visuels restent locaux et gitignorés.** `image_url` est signée et expire
  (d'où la miniature base64 du script), et committer les artworks les
  redistribuerait — licence CD PROJEKT RED, usage local uniquement.
- L'appariement avec Cardmarket reste incertain pour les 37 cartes à variantes.
  Côté vue Netdeck, l'incertitude porte alors sur le **prix** et non sur
  l'identité de la carte : c'est le bon endroit pour elle.

### Ajouter une donnée venue de Netdeck

`types.ts` → `Printing` et `Row`, `lib/dataset.ts` → `buildRows`, puis une
colonne. **Se demander d'abord si la donnée est au niveau carte ou impression** :
`slug` identifie la carte et se propage sans risque ; `rarity`, `number` et
`uuid` identifient une impression et ne peuvent être attribués que lorsque
l'appariement est certain (voir « Limites des données »).

### Changer ou ajouter une source de données

- **Un nouveau format d'import** : `lib/ingest.ts`, fonction `parse()` — la
  reconnaissance se fait sur la clé racine du JSON. Ajouter la variante au type
  `Parsed`, et `describe()` devra la traiter (le `switch` est exhaustif, le
  compilateur le signale). Puis brancher dans `hooks/use-dataset.ts`.
- **Une nouvelle extension Cardmarket** : `data/expansions.ts`, `EXPANSIONS` et
  `DEFAULT_CODES`.

### Persister quelque chose

Rien n'est persisté aujourd'hui, sauf le thème (`use-theme.ts`, localStorage). Les
imports et les codes d'impression vivent en mémoire — c'est **voulu**, pas un oubli
(voir README). Si un besoin de persistance apparaît, le point d'accroche est
`hooks/use-dataset.ts`, pas les composants.

## Architecture

Trois couches, dans cet ordre de dépendance :

| Couche | Rôle | Contrainte |
|---|---|---|
| `src/lib/` | fonctions pures | ni React, ni DOM — importable depuis un test sans rien monter |
| `src/hooks/` | état | porte l'état, appelle `lib/`, ne rend rien |
| `src/components/` | rendu | pas de logique métier, reçoit tout par props |

Ce qui la fait tenir, concrètement :

- **Une transformation va dans `lib/`.** Pas dans un composant, pas dans un
  `useMemo`. Si elle est dans un `useMemo`, elle n'est pas testable — c'est le
  signal. `resolveSorting` a été extraite pour cette raison exacte.
- **`components/columns.tsx` est la seule exception assumée** : une `ColumnDef`
  TanStack contient son `cell`, donc du JSX. La configuration y est, la sémantique
  pure qu'elle référence reste dans `lib/table.ts`.
- **`hooks/use-table.ts` reçoit les colonnes en argument.** Sans ça un hook
  importerait un composant, et la dépendance s'inverserait.
- **Pas de contexte React.** `codes` et `expansions` traversent quelques props ;
  c'est délibéré. Un contexte rendrait les composants dépendants d'un provider et
  cesserait de les rendre testables isolément — pour économiser deux props.

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

`useDataset` est la source de vérité des **données**, `useTable` celle de l'**état
de la table**. Ne pas dupliquer l'un dans l'autre.

## Invariants à ne pas casser

Tous couverts par des tests : si l'un saute, `npm run test` le dit.

- **Valeurs manquantes.** Accesseurs en `undefined`, colonnes en
  `sortUndefined: "last"`. TanStack traite ce cas *avant* d'inverser pour le tri
  décroissant — c'est ce qui garde les lignes sans cote en bas dans les deux sens.
  Renvoyer `null` casse ça silencieusement.
  *Limite connue* : l'ordre **entre** deux lignes sans cote n'est pas spécifié
  (le comparateur de TanStack n'est pas cohérent sur ce cas). Ne pas écrire de
  test qui en dépend.
- **Ex æquo.** `buildRows` et `buildCards` trient par nom en collation française.
  À valeur égale TanStack retombe sur l'index d'origine, donc sur ce tri-là. Il
  n'y a pas de comparateur secondaire à écrire — mais supprimer ce tri amont
  rendrait l'ordre des ex æquo aléatoire.
- **Recherche** (`searchRow`, `lib/table.ts`). Contrat : requête et ligne sont
  découpées en mots — accents retirés, ponctuation en séparateur — et chaque mot
  de la requête doit **commencer** un mot de la ligne. Donc « V corpo » trouve
  « V - Corporate Exile », l'ordre des mots est libre, et un début de mot suffit.
  Le début de mot n'est pas cosmétique : en sous-chaîne libre, un terme d'une
  lettre s'apparie partout (« v » dans « Surveillance ») et double le bruit.
  Contrepartie assumée : un fragment pris au milieu d'un mot ne trouve rien.
  `enableGlobalFilter` n'est vrai que sur la première colonne, sinon TanStack
  rejoue le prédicat sur chaque colonne de chaque ligne.
- **TanStack détient l'état de la table.** `FiltersBar` lit et écrit dans
  l'instance. Ne pas réintroduire de copie React du tri ou des filtres.
- **Jointure Netdeck** (`lib/enrich.ts`) : repli sur le nom seul **uniquement si
  la carte n'a qu'une impression connue**. Ce garde-fou évite d'attribuer le
  mauvais numéro de collecteur aux réimpressions. Ne pas l'assouplir.
- **Rareté** (`data/rarities.ts`). La colonne trie par **rang**, pas par ordre
  alphabétique — sinon « Epic » passerait avant « Common ». L'ordre de la liste
  `RARITIES` est le rang ; les libellés Netdeck sont normalisés via `norm()`, et
  une rareté inconnue est affichée telle quelle et rangée après les connues.
- **`norm()` et `words()`** (`lib/format.ts`) se ressemblent mais ne servent pas
  à la même chose. `norm()` colle tout (« V - Streetkid » → `vstreetkid`) : c'est
  la clé de jointure entre sources, elle reproduit exactement le `set.code` de
  Netdeck — la modifier casse la jointure. `words()` garde les frontières de mots :
  c'est la recherche. Ne pas remplacer l'une par l'autre.
- **Export CSV** : séparateur `;`, virgule décimale, BOM UTF-8. C'est ce qui permet
  à Excel FR d'ouvrir le fichier sans assistant d'import. Ne pas « normaliser »
  en RFC 4180.

## Tests

Vitest lit `vite.config.ts` : l'alias `@/` et le JSX marchent sans configuration.

- Les tests vivent à côté du code (`src/lib/*.test.ts`) et la fixture dans
  `src/test/`.
- **La fixture est synthétique, jamais `dataset.json`** : les cotes changent à
  chaque `npm run data:refresh`, des tests assis dessus casseraient sans qu'aucun
  code n'ait bougé. Elle couvre exprès les cas tordus : une réimpression, un
  scellé sans idMetacard, un produit sans cote, un produit foil seulement, et des
  noms accentués pour la collation.
- `src/test/table.ts` monte une instance TanStack headless : c'est par là qu'on
  teste tri, filtres et CSV, plutôt que les fonctions isolées — c'est le
  comportement observable qui compte.
- Une nouvelle colonne, un nouveau filtre ou un nouveau mode méritent un test :
  ils sont tous exprimables en trois lignes avec `makeTable`.

## shadcn/ui, Radix et Tailwind

La consigne du projet : **uniquement Tailwind et les composants shadcn natifs.**

- **Fichiers du registry non modifiés** : `src/components/ui/**` et
  `src/hooks/use-mobile.ts`. Ils doivent rester régénérables à l'identique par la
  CLI — donc pas d'édition, pas même un commentaire d'en-tête. Nouveau composant :
  `npx shadcn@latest add <nom>`, jamais écrit à la main. Toute personnalisation
  vit dans `src/components/`.
- **Radix exclusivement.** Le `Combobox` du registry dépend de `@base-ui/react` ;
  `extension-combobox.tsx` le reconstruit avec `Popover` + `Command` + `Badge`,
  eux aussi natifs. Ne pas introduire `@base-ui/react` (README § « Note sur le
  combobox »).
- **Élément brut ou composant shadcn ?** Le composant quand il raccourcit le code
  (`Button variant="ghost"` pour les en-têtes triables). L'élément brut quand le
  composant imposerait une cascade d'overrides pour le neutraliser (les tuiles de
  `StatsStrip`, qui partagent une bordure de grille qu'une `Card` casserait).
- **Aucune couleur en dur.** Toujours les tokens : `bg-card`,
  `text-muted-foreground`, `text-destructive`. Ils vivent dans les blocs `:root` /
  `.dark` de `src/index.css`. Thème : base **Mist**, accent **Yellow**,
  `--radius: 0`, police **Geist** (locale).
- **TanStack Table épinglé en 8.21.3.** La v9 est en `latest` mais change toute
  l'API ; la recette data-table de shadcn est écrite pour la v8. Migrer est un
  chantier, pas un `npm update`.

## Conventions de code

- **En-tête de fichier obligatoire** : chaque fichier du projet s'ouvre sur un bloc
  `/** … */` de une à trois lignes disant ce qu'il fait, et pourquoi il est écrit
  comme ça quand ce n'est pas évident. Exception : les fichiers du registry.
- **Pas de point-virgule**, guillemets doubles, indentation 2 espaces.
- Alias `@/` → `src/`, déclaré dans `tsconfig.json` **et** `vite.config.ts`.
- Exports nommés partout, sauf `App.tsx` (default).
- React : `import * as React from "react"`, `React.useState`.
- Ordre des imports : externes → `@/components/ui` → `@/components` → `@/data` →
  `@/hooks` → `@/lib` → `@/test` → `import type … from "@/types"` en dernier.
- Nommage court côté données (`mc`, `exp`, `avgF`, `d`, `df`) : assumé, chaque
  champ est documenté dans `src/types.ts`.
- **Commentaires et UI en français.** Les commentaires disent *pourquoi*, pas
  *quoi*. Les conserver lors d'un refactor.
- `AnyRow` (`Row & CardRow`) sert aux `cell` et au CSV, qui rendent indifféremment
  un produit ou une carte. Cast contenu à ces endroits — ne pas le répandre.

## Limites des données

Ces contraintes viennent des sources, pas du code. Ne pas « réparer » :

- `avg1`, `avg7`, `avg30` et leurs variantes foil sont **vides à 100 %** dans
  l'export Cardmarket, `trend-foil` vaut 0 partout : colonnes non déclarées.
- **`low` n'est pas un prix de vente** mais la plus petite annonce. Sur un marché à
  trois annonces, c'est du bruit ; `trend` est plus honnête. La somme des `low`
  n'est pas une valorisation — le libellé de `StatsStrip` doit rester prudent.
- Cardmarket ne publie **ni numéro de collecteur ni rareté**. L'export brut ne
  contient que `idProduct, name, idCategory, categoryName, idExpansion,
  idMetacard, dateAdded` — rien d'autre à en tirer. Les colonnes « N° » et
  « Rareté » n'apparaissent qu'une fois `cards_enriched.json` importé.
- **Une impression n'a pas de dénomination côté Cardmarket.** 37 cartes (76
  produits, 26 % des singles) existent en plusieurs exemplaires dans une même
  extension, sous un nom strictement identique : seuls l'`idProduct` et
  l'horodatage d'ajout les séparent. Ce sont les variantes de rareté.
  `buildRows` n'attribue donc une rareté et un numéro **que lorsqu'un produit
  fait face à une seule impression Netdeck** ; sinon il expose les raretés
  candidates, affichées en pointillés. **Ne pas remplacer ça par une heuristique**
  (apparier par le prix, par l'ordre des `idProduct`) sans décision explicite :
  ce serait afficher une valeur inventée avec l'assurance d'une valeur mesurée.
- Les **codes d'impression** (MS01B, SD02B…) n'existent dans aucune source. Seuls
  MS01B et SD02B sont confirmés (`sure: true`), le reste est déduit et affiché en
  pointillés.
- Les extensions **6717** et **6719** n'ont aucun produit scellé : nom inconnu.
- **CORS Netdeck** : `api.netdeck.gg` restreint l'origine à
  `https://cyberpunktcg.com`. L'appel doit rester dans un script Node avec en-tête
  `Origin`, jamais depuis le navigateur.

### Un comportement à trancher

Documenté et testé tel quel, mais discutable — à arbitrer avant de s'appuyer
dessus : **`matchExpansion` garde le libellé le plus long** en cas d'ambiguïté,
donc une correspondance exacte peut perdre face à un libellé plus long qui la
contient (« Beta Kit » → « Beta Kit Deluxe »). Inoffensif tant qu'aucune extension
n'est le préfixe d'une autre.

## Versionnement

Dépôt git sur `main`.

| Chemin | Suivi | Pourquoi |
|---|---|---|
| `src/data/dataset.json` | **oui** | dérivé qui fait foi, amorce de l'app — le committer après chaque `npm run data:cardmarket` |
| `src/data/expansions.ts` | **oui** | libellés et codes d'impression saisis à la main, seule mémoire de ce travail |
| `data/cardmarket/` | non | exports bruts republiés quotidiennement, retéléchargeables — diffs illisibles |
| `cards_enriched.json`, `netdeck-raw.json` | non | sorties de scripts, régénérables |
| visuels de cartes | non | licence CD PROJEKT RED, usage local, pas de redistribution |

Sur un clone frais, l'app démarre telle quelle ; `npm run data:refresh` reconstitue
`data/cardmarket/` puis régénère le dérivé.
