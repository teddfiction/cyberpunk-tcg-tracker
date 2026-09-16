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

**La largeur d'une colonne se règle par son `meta.className`**, en `max-w-[…]`
plus `truncate` — il n'y a pas de largeur déclarée à TanStack. Les colonnes
textuelles (Produit, Extension, Rareté) sont plafonnées parce que leur contenu
le plus long, et non leur en-tête, dictait sinon la largeur de la table : une
seule ligne ambiguë étirait Rareté de moitié. Mesurer avant de plafonner, le
coupable n'est pas toujours celui qu'on croit.

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

### Ajouter un filtre à la grille de cartes

**Deux fichiers, et un test qui réclame le second.**

1. `lib/facets.ts` → une entrée dans `FACETS` : identifiant de colonne, libellé,
   valeurs qu'une carte apporte, ordre des options (`count`, `numeric`, `rarity`).
2. `components/grid-columns.ts` → la colonne du même identifiant, avec son
   `filterFn` : `filterIn` pour une valeur scalaire, `filterAny` pour une liste.

Les effectifs affichés sont comptés sur **toutes** les cartes, jamais sur les
seules visibles : sinon cocher une option ferait disparaître les autres et l'on
ne pourrait plus élargir sa sélection.

### Ajouter un tri à la grille de cartes

**Un fichier : `lib/sorts.ts`**, une entrée dans `SORTS` — un libellé et l'état
TanStack correspondant. Le menu se remplit tout seul, et un test vérifie que
chaque tri vise une colonne qui existe dans `grid-columns.ts`.

Le tri ne se double pas d'un `useState` : `sortIdOf` retrouve l'entrée active
depuis l'état de la table, qui en reste seule dépositaire.

### Ajouter une vue

**Trois fichiers, et le compilateur indique les deux derniers.**

1. `lib/views.ts` → une entrée dans `VIEWS` : libellé, et sous-titre facultatif.
2. `npm run typecheck` échoue alors sur `ICONS` (`components/app-sidebar.tsx`)
   puis sur `render` (`App.tsx`), tous deux des `Record<View, …>` : donner
   l'icône, puis le rendu.

`View` est dérivé de `VIEWS` (`keyof typeof VIEWS`) : il n'y a pas d'union de
chaînes à maintenir à côté. Même mécanique que les modes.

**Pour une vue qui affiche une table**, ne pas recâbler TanStack : `useTable`
est générique sur la forme de ligne. Lui passer `data`, `columns`, `defaultSort`,
`getRowId`, `globalFilterFn` et `meta`, et `DataTable` rend l'instance telle
quelle. C'est ce que fait la base de cartes, dont les lignes n'ont rien à voir
avec celles des cotes.

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
- **Un téléchargement à chaud** : `lib/remote.ts`, plus une entrée dans le
  `proxy` de `vite.config.ts`. Rendre un `File` et le passer à `importFiles`
  plutôt que d'écrire un second chemin d'import — parse, compte rendu,
  conservation et avis suivent alors tout seuls. C'est ce que fait
  « Actualiser les données ».
- **Une URL Cardmarket** : `data/cardmarket.ts`, et rien d'autre. Le script de
  téléchargement, le relais de `vite.config.ts` et le bouton y puisent tous les
  trois.

### Persister quelque chose

Deux stockages, choisis selon la taille : `localStorage` pour le thème
(`use-theme.ts`), **IndexedDB pour les imports et les codes** (`lib/store.ts`,
orchestré par `hooks/use-dataset.ts`). Au-delà de quelques kilo-octets c'est
IndexedDB — `localStorage` plafonne vers 5 Mo et ne stocke que du texte, là où
IndexedDB range les objets tels quels, sans `JSON.stringify` sur 14 Mo.

`lib/store.ts` ne lève jamais : navigation privée, quota plein ou stockage bloqué
rendent `false` et l'app continue. Mais l'échec est **rendu, pas avalé** —
`importFiles` prévient alors l'utilisateur que rien ne sera conservé. Garder cette
propriété : un stockage qui échoue en silence est pire que pas de stockage.

## Architecture

**Les scripts partagent `src/`.** `scripts/*.ts` est lancé par `tsx`, qui
résout l'alias `@/` depuis `tsconfig.json`. `build-dataset.ts` ne sait donc plus
lire Cardmarket : il appelle `parse()`, celui-là même qui sert aux imports à
chaud. Avant, le mapping des prix, celui du catalogue et `shortCategory`
existaient dans le script **et** dans `lib/ingest.ts`, identiques mot pour mot —
une seule des deux copies aurait été corrigée le jour où un champ change, et le
jeu embarqué aurait divergé des imports sans qu'aucun test bronche. Ne pas
réintroduire de logique de lecture dans `scripts/`.

`netdeck-export.mjs` reste en `.mjs` : il ne partage rien avec `src/`, mais ses
objets reproduisent à la main `Printing` et `EnrichedCard`. Le passer en TS
mettrait le compilateur sur ce contrat-là aussi.

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

L'app a **deux tables**, qui partagent toute la mécanique et ne diffèrent que par
leurs lignes et leurs colonnes :

| Vue | Ligne | Construite par | Colonnes | Rendu |
|---|---|---|---|---|
| Data table | un produit Cardmarket, ou une carte regroupée | `lib/dataset.ts` | `components/columns.tsx` | `DataTable` |
| Base de cartes | une carte Netdeck, ses impressions en modale | `lib/printings.ts` | `components/grid-columns.ts` | `CardGrid` + `CardDialog` |

**La grille est une table sans table.** Ses colonnes ne rendent rien : elles
portent les facettes, la recherche et l'export CSV, et `CardGrid` dessine les
tuiles à partir de `table.getRowModel().rows`. C'est ce qui évite un second
moteur de filtrage — ajouter une facette reste une ligne dans `lib/facets.ts`
plus sa colonne dans `grid-columns.ts`, et un test vérifie que chaque facette a
bien la sienne.

Elle est la seule vue à **plafonner sa largeur** (`max-w-7xl`, quatre colonnes
au plus) là où la table des cotes s'étale : à 1280 px les tuiles font 308 px,
soit juste sous les 320 px natifs des miniatures, et il n'existe pas d'image
plus grande à aller chercher (voir « Limites des données »). Les versions
s'ouvrent en modale plutôt qu'en dépliant la tuile — sous une tuile, les
artworks tenaient dans 40 px de haut, illisibles, et déplier repoussait toute la
grille. Radix ne rend pas le focus à la tuile en sortant : `CardDialog` le fait
lui-même, sinon le clavier repartirait du haut des 151 tuiles à chaque
fermeture.

**Le visuel d'une tuile suit la rareté filtrée.** Cocher « Iconic Legend » fait
montrer l'illustration Iconic Legend de chaque carte, et la modale s'ouvre sur
cette version-là. C'est `printingIndex` (`lib/printings.ts`) qui l'élit, au
rendu et non dans la donnée : le choix dépend de l'état de la table, que
`buildGrid` ne connaît pas — d'où l'absence de champ `thumb` sur `GridCard`. La
raison est celle de la modale : l'artwork est la seule chose qui distingue deux
impressions, donc une grille filtrée par rareté qui garderait le visuel par
défaut ne montrerait rien de ce qu'on vient de demander. Les replis — carte qui
ne porte pas la rareté cochée, impression sans miniature — ramènent au rang 0.
C'est aussi pourquoi la facette Rareté a un identifiant nommé (`RARITY_FACET`,
`lib/facets.ts`) : `NetdeckView` la vise en dehors du registre des facettes.

La base de cartes montre ce que la table des cotes ne peut pas montrer : les
cartes qu'aucun vendeur ne propose. Sa cote Cardmarket n'est rattachée que
lorsqu'un seul produit correspond à la carte dans l'extension ; sinon elle
affiche la fourchette en pointillés, sans élire de produit — **même règle que la
colonne Rareté**, et pour la même raison.

Sur la conservation des imports :

- **L'écriture n'a lieu qu'après un import réussi**, jamais sur un changement
  d'état. Au premier rendu l'app est encore sur le jeu embarqué : une sauvegarde
  automatique écraserait ce que la relecture est en train de restaurer. Pour la
  même raison `importFiles` accumule dans une variable locale au lieu de relire
  les setters de React, qui ne seraient pas à jour à temps.
- Le stockage est **local à un navigateur** : il ne suit ni le dépôt, ni une
  autre machine. Paramètres → « Oublier les données conservées » repart du jeu
  embarqué.
- `codes` est conservé lui aussi, mais le reporter dans `src/data/expansions.ts`
  reste ce qui le rend permanent et partagé.

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
- **Recherche : la déclarer par `id`, jamais par rang.** `enableGlobalFilter`
  n'est vrai que sur la colonne `name`. La viser par sa position casserait la
  recherche en silence dès qu'une colonne passe devant — la colonne Visuel n'a
  pas d'accesseur, donc `getCanGlobalFilter()` y répond faux, et TanStack qui ne
  trouve aucune colonne cherchable cesse simplement de filtrer. Aucune erreur,
  juste toutes les lignes qui remontent. Un test le verrouille.
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
- **Filtres de la grille : `DropdownMenu` + `DropdownMenuCheckboxItem`.** Son
  indicateur est déjà posé à gauche du libellé par le registry, rien à
  surcharger. Le champ de recherche est un `Input` ordinaire et non `Command` :
  cmdk ne peut pas vivre dans un menu Radix, les deux se disputent les flèches
  et la frappe. Deux conséquences à ne pas défaire — le champ se focalise à la
  frame suivant l'ouverture (un menu Radix focalise toujours son premier item
  et n'expose pas `onOpenAutoFocus`), et `ArrowDown` depuis le champ vise
  explicitement le premier item, faute de quoi le clavier reste prisonnier de
  la recherche.
- **Radix exclusivement.** Le `Combobox` du registry dépend de `@base-ui/react` ;
  `extension-combobox.tsx` le reconstruit avec `Popover` + `Command` + `Badge`,
  eux aussi natifs. Ne pas introduire `@base-ui/react` (README § « Note sur le
  combobox »).
- **`SidebarInset` porte un `min-w-0`, et il n'est pas décoratif.** Le composant
  du registry cumule `w-full` et `flex-1` : sa largeur minimale automatique
  reste donc plafonnée à 100 % du conteneur, et il ne rétrécit jamais de la
  largeur de la barre latérale. Sans ce `min-w-0` posé dans `App.tsx`, c'est la
  page entière qui défile horizontalement — filtres compris — au lieu de la
  seule table, qui a pourtant son propre `overflow-x-auto`. Le retirer ramène le
  débordement, à l'identique et en silence.
- **Élément brut ou composant shadcn ?** Le composant quand il raccourcit le code
  (`Button variant="ghost"` pour les en-têtes triables). L'élément brut quand le
  composant imposerait une cascade d'overrides pour le neutraliser (les tuiles de
  `StatsStrip`, qui partagent une bordure de grille qu'une `Card` casserait).
- **Aucune couleur en dur.** Toujours les tokens : `bg-card`,
  `text-muted-foreground`, `text-destructive`. Ils vivent dans les blocs `:root` /
  `.dark` de `src/index.css`. Thème : base **Slate**, accent **Yellow**,
  graphiques **Cyan**, `--radius: 0`, polices **Geist** et **Geist Mono**
  (locales, SIL OFL 1.1). Base et accent sont deux axes : changer de base ne
  touche pas aux tons `primary` / `ring` / `sidebar-primary`, qui restent jaunes.
- **Le thème sombre s'écarte de Slate, exprès.** `--background` et `--sidebar`
  sont un noir pur et non slate-950/900 : rien ne doit disputer l'éclat des
  visuels de carte, qui sont ce que la base de cartes montre. Le chrome et le
  contenu ne se distinguent donc plus que par une bordure. Celle-ci est adoucie
  (`--border`, `--input`, `--sidebar-border` entre slate-900 et slate-800) :
  assez sombre pour s'effacer sur le noir, assez claire pour rester visible sur
  le slate-900 des cartes. Le thème clair n'y touche pas — un fond noir n'y
  aurait aucun sens.
- **Les couleurs de carte du jeu sont des données, pas du thème**, mais elles
  suivent la même règle : `--card-red/-yellow/-green/-blue` dans `index.css`,
  réglées par thème (Tailwind 600 en clair, 400 en sombre — une teinte lisible
  sur slate-50 ne l'est pas sur slate-950). `data/colors.ts` fait la jointure ;
  aucun composant n'écrit de couleur.
- **Toasts : `sonner`.** Le registry ne sert plus de `toast` Radix — `sonner` est
  le composant shadcn natif aujourd'hui, seule entorse admise à la règle Radix.
  Son fichier lit le thème dans `next-themes`, absent de provider ici : `App.tsx`
  lui impose le thème par la prop `theme`, que son `{...props}` laisse gagner.
  Pas de `richColors` : la distinction succès/erreur passe par l'icône, la
  surface reste sur `--popover`.

  **Dix secondes et un bouton de fermeture**, posés à l'appel dans `App.tsx`.
  Un import de trois fichiers rend quatre à six phrases : les quatre secondes
  par défaut de sonner ne laissaient pas le temps de les lire. Le compte rendu
  est découpé par `sentences` (`lib/format.ts`) et rendu en
  `whitespace-pre-line` — la coupure exige un point **suivi d'une majuscule ou
  d'un chiffre**, ce qui protège les noms de fichiers, où le point précède une
  minuscule ou une ponctuation.
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
  l'export Cardmarket, `trend-foil` n'a qu'une seule valeur distincte (0) :
  colonnes non déclarées. Revérifié sur l'export du 15/09/2026 — ce n'est pas
  une observation qui date.
- **`dateAdded` est le seul champ que Cardmarket donne et qui ne soit pas déjà
  affiché ailleurs.** Colonne « Ajouté le », dans les trois modes. Gardé en
  chaîne : le format « AAAA-MM-JJ hh:mm:ss » est à largeur fixe, donc l'ordre
  lexicographique est l'ordre chronologique, là où `new Date()` sur cette forme
  n'est pas standard. Sur le relevé du 15/09/2026 : 304 produits versés le
  28/08, puis 8 le 07/09 et 5 le 11/09.
- **Le schéma est contrôlé.** Les trois exports annoncent `version: 1` à leur
  racine ; `parse()` refuse toute autre valeur. C'est le seul avertissement
  qu'on aura avant que les champs bougent.
- **`low` n'est pas un prix de vente** mais la plus petite annonce. Sur un marché à
  trois annonces, c'est du bruit ; `trend` est plus honnête. La somme des `low`
  n'est pas une valorisation — le libellé de `StatsStrip` doit rester prudent.
- **Couverture Netdeck** (relevé du 15/09/2026) : 151 cartes, qui couvrent par
  le nom **293 des 296 singles** Cardmarket, soit 99 %. Netdeck étiquette ses
  cartes avec les sets *retail* alors que le catalogue Cardmarket est
  essentiellement en Beta / Demo / Alpha Kit — mais ce sont les mêmes cartes,
  donc l'appariement par nom fonctionne. `PRM01` (« Set 1 Promos ») confirme au
  passage l'hypothèse notée dans `data/expansions.ts` pour 6717 / 6719.
  Raretés réellement rencontrées : Common, Uncommon, Rare, Epic, Secret, Nova
  Rare — les trois « Iconic » de `data/rarities.ts` n'existent pas encore dans
  les données.
- **Pas d'URL d'image publique.** `image_url` est signée et expire ;
  `source_image_url`, sa variante nue, est refusée par CloudFront (« Missing
  Key-Pair-Id »). La miniature produite par `npm run data:netdeck:images` est
  donc la seule image dont dispose l'app, pour la colonne comme pour l'aperçu au
  survol — d'où sa largeur de 320 px et le poids du fichier (~14 Mo en 320 px,
  réglable par `--width=`). Ce fichier reste local et gitignoré : les visuels
  sont sous licence CD PROJEKT RED.
- **Netdeck nomme le numéro de collecteur différemment selon l'endpoint** : la
  liste dit `print_number`, le détail dit `collector_number`. `printingOf`
  (`scripts/netdeck-export.mjs`) lit les deux. N'en lire qu'un laissait 351 des
  502 impressions sans numéro — seule celle de tête en recevait un, et les
  autres paraissaient ne pas en avoir. Les numéros distinguent les variantes
  qu'aucun autre champ ne sépare : « 005a » et « 005b » sont deux Rare du même
  illustrateur, le préfixe « β » marquant les tirages Beta.
- **L'impression de référence d'une carte est celle de rang 0**, pas « celle qui
  porte un numéro » : l'endpoint liste sert la version par défaut, le script la
  pousse en tête, et `PrintRow.rank` la retrouve après le tri à plat de
  `buildPrintings`. Le critère du numéro ne discrimine plus rien depuis qu'elles
  en ont toutes un.
- Cardmarket ne publie **ni numéro de collecteur ni rareté**. L'export brut ne
  contient que `idProduct, name, idCategory, categoryName, idExpansion,
  idMetacard, dateAdded` — rien d'autre à en tirer. Les colonnes « N° » et
  « Rareté » n'apparaissent qu'une fois `cards_enriched.json` importé.
- **Une version n'a pas de dénomination côté Cardmarket.** 37 cartes (76
  produits, 26 % des singles) existent en plusieurs exemplaires dans une même
  extension, sous un nom strictement identique : seuls l'`idProduct` et
  l'horodatage d'ajout les séparent.

  Mesuré sur l'export du 15/09/2026 : **Netdeck publie une rareté par carte**,
  jamais plusieurs impressions divergentes, et ces 37 cartes sont exclusivement
  Rare (18), Epic (15) ou Secret (4) — les Common et Uncommon n'ont jamais de
  doublon. La rareté est donc une propriété de **la carte**, et vaut pour toutes
  ses versions Cardmarket. `buildRows` l'affiche en clair dès que les
  impressions connues s'accordent, et ne passe en pointillés que si elles
  divergent — cas qui ne se produit pas aujourd'hui.

  Ce qui reste inconnu, c'est **quelle version physique** est tel `idProduct`.
  Cette incertitude-là est portée par `Row.variants` et affichée sous le nom
  (« · 2 versions »), pas par la colonne Rareté. **Ne pas apparier les versions
  par une heuristique** (le prix, l'ordre des `idProduct`) sans décision
  explicite : ce serait afficher une valeur inventée avec l'assurance d'une
  valeur mesurée.
- Les **codes d'impression** (MS01B, SD02B…) n'existent dans aucune source. Seuls
  MS01B et SD02B sont confirmés (`sure: true`), le reste est déduit et affiché en
  pointillés.
- Les extensions **6717** et **6719** n'ont aucun produit scellé : nom inconnu.
- **CORS Netdeck** : `api.netdeck.gg` restreint l'origine à
  `https://cyberpunktcg.com`. L'appel doit rester dans un script Node avec en-tête
  `Origin`, jamais depuis le navigateur.
- **CORS Cardmarket** : `downloads.s3.cardmarket.com` n'envoie **aucun** en-tête
  `Access-Control-Allow-Origin` — mesuré. Un `fetch` depuis la page échoue, et
  `mode: "no-cors"` ne rend qu'une réponse opaque, illisible. D'où le `proxy` de
  `vite.config.ts`, déclaré pour `server` **et** `preview`. Ce relais n'existe
  pas dans un `dist/` servi en statique : `fetchPriceGuide` le détecte à la
  réponse HTML renvoyée avec un 200, et le dit. Ne pas remplacer par un proxy
  CORS public — ce serait faire transiter les données par un tiers.

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
