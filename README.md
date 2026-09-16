# Cyberpunk Tracker — Trading Card Game

Suivi des cotes Cardmarket du Cyberpunk TCG (WeirdCo), base des cartes
officielles, et collection.

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (primitives Radix UI)
· TanStack Table v8 · Vitest.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # vitest
npm run typecheck
npm run build      # dist/
```

Le dépôt embarque un jeu de données (`src/data/dataset.json`) : l'app tourne
immédiatement, sans téléchargement préalable. Les sections suivantes décrivent
ce qu'elle montre, puis comment rafraîchir ses données.

## Les trois vues

- **Cotes Cardmarket** — la table des produits Cardmarket : recherche, filtres,
  tri, trois modes (normal, foil, par carte), export CSV. Visuel, numéro de
  collecteur et rareté s'y ajoutent une fois l'enrichissement Netdeck importé.
- **Base de cartes** — la grille des cartes officielles, y compris celles
  qu'aucun vendeur ne propose. Facettes, tris (« Couleur › Type › Coût » par
  défaut, comme sur cyberpunktcg.com), et une modale par carte pour parcourir ses
  impressions — visuel, rareté, numéro et cote de chacune. Elle se remplit une
  fois `cards_enriched.json` importé.
- **Collection** — la même grille, réduite aux versions possédées : une tuile
  par version, mêmes filtres, recherche et tris, et la complétion en tête. Les
  quantités se règlent dans la modale d'une carte, depuis la base comme depuis
  la collection ; la base montre ce qu'on possède déjà (quantités sur les
  tuiles et les versions, filtre Possédée / Manquante).

## Exploiter l'app

### 1. Rafraîchir les cotes Cardmarket

Les exports bruts vivent dans `data/cardmarket/`, **non versionné** : ils sont
retéléchargeables et republiés quotidiennement. C'est le dérivé
`src/data/dataset.json` qui fait foi et qui est committé.

```bash
npm run data:refresh        # télécharge les trois exports puis régénère dataset.json
```

Équivalent en deux temps, si l'on veut inspecter les fichiers bruts avant conversion :

```bash
npm run data:fetch          # → data/cardmarket/*.json
npm run data:cardmarket     # → src/data/dataset.json
```

`data:fetch` refuse d'écrire une réponse non-JSON : un portail captif ou une
redirection est signalé tout de suite, plutôt que de faire échouer la conversion
plus loin avec un message obscur. En cas de blocage réseau, les trois fichiers se
téléchargent à la main :

```
https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_23.json
https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_23.json
https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_23.json
```

`data:cardmarket` récapitule produits, cotes, lignes de prix orphelines et produits
sans cote. Relancer `npm run dev` pour voir le nouveau jeu, puis committer
`src/data/dataset.json`.

Pour un simple coup d'œil sans toucher à l'amorce, `price_guide_23.json` seul
suffit : bouton « Importer un JSON » dans l'app. L'import est conservé dans ce
navigateur, sans toucher à l'amorce du dépôt.

**Bouton « Actualiser les données »** (barre latérale, groupe « Données ») :
télécharge les **trois** exports du jour et les applique sans passer par un
fichier — les catalogues d'abord, le price guide ensuite. Tout ou rien : un
import partiel laisserait catalogue et cotes à des dates différentes. Le
résultat est conservé dans le navigateur comme n'importe quel import — il ne
touche pas à `src/data/dataset.json`, qui reste l'amorce du dépôt. Pour figer
les cotes dans le dépôt, c'est toujours `npm run data:refresh` puis un commit.

Ce bouton n'existe qu'avec `npm run dev` ou `npm run preview` : les exports
Cardmarket n'envoient aucun en-tête CORS, et c'est le serveur Vite qui relaie
l'appel. Un `dist/` servi en statique n'a personne pour le faire — le bouton le
dit alors clairement au lieu d'échouer en silence.

### 2. Enrichir : numéros de collecteur, raretés, visuels

Cardmarket ne publie ni numéro de collecteur ni rareté. L'API Netdeck les fournit.

```bash
npm run data:netdeck           # métadonnées seules
npm run data:netdeck:images    # + miniatures webp base64 (npm i sharp)
```

Produit `cards_enriched.json` à la racine (non versionné). Le charger via
« Importer un JSON » — une modale liste les formats reconnus et ce que chacun
remplace, et accepte le glisser-déposer : la table des cotes gagne les colonnes Visuel, N° et
Rareté, et la base de cartes se remplit. Toutes les impressions portent un numéro
de collecteur, et une miniature si le script a tourné avec `--images`.

L'API `api.netdeck.gg` restreint le CORS à `https://cyberpunktcg.com` : l'appel doit
partir d'un script Node avec l'en-tête `Origin`, jamais du navigateur. Si le schéma
a changé, `node scripts/netdeck-export.mjs --raw` dumpe la réponse brute à inspecter.

### 3. Figer les codes d'impression

Les codes (MS01B, SD02B…) n'existent dans aucune source et sont saisis à la main.

1. Onglet **Paramètres**, renseigner le code de chaque extension. Toute saisie vaut
   confirmation : le badge passe de pointillés à plein.
2. **Copier le mapping JSON**.
3. Reporter le résultat dans `DEFAULT_CODES` (`src/data/expansions.ts`) et committer.

La saisie est conservée dans le navigateur, mais seule cette étape la rend
permanente et partagée.

### 4. Exporter

Bouton **Exporter en CSV**, dans les trois vues : colonnes du mode courant pour
la table des cotes, une ligne par carte pour la base de cartes, une ligne par
version possédée — avec le nombre d'exemplaires — pour la collection. Lignes filtrées et
triées telles qu'affichées. Séparateur `;`, virgule décimale, BOM UTF-8 — Excel
FR ouvre le fichier sans assistant d'import.

### 5. Sauvegarder la collection

La collection est la seule donnée saisie à la main, et elle ne vit que dans ce
navigateur. **Paramètres → Exporter la sauvegarde (JSON)** écrit
`cyberpunk-tcg-collection-AAAA-MM-JJ.json`. Pour la restaurer, l'importer par
« Importer un JSON » : elle **remplace intégralement** la collection en cours.
« Oublier les données conservées » n'y touche pas.

Une version possédée que la base importée ne connaît pas reste conservée, et la
vue Collection la signale par son nom plutôt que de la supprimer.

### Cycle type

| Quand | Quoi |
|---|---|
| Suivi régulier des cotes | `npm run data:refresh`, puis committer `src/data/dataset.json` |
| Nouvelle extension | `npm run data:refresh`, puis `npm run data:netdeck`, compléter `EXPANSIONS` puis `DEFAULT_CODES` |
| Cotes du jour, sans quitter l'app | bouton « Actualiser les données », rien à committer |
| Vérification ponctuelle | import à chaud dans l'app, rien à committer |

## Structure

```
data/cardmarket/        exports bruts Cardmarket — non versionné, entrée du pipeline
public/fonts/           Geist et Geist Mono, variables (woff2, SIL OFL 1.1)
scripts/
  fetch-cardmarket.ts   téléchargement des exports Cardmarket
  build-dataset.ts      exports Cardmarket  →  src/data/dataset.json
  netdeck-export.mjs    API cyberpunktcg.com →  cards_enriched.json
src/
  components/
    ui/                 composants shadcn/ui, registry new-york-v4, non modifiés
    app-sidebar.tsx     navigation, import, actualisation, thème
    card-thumb.tsx      vignette et aperçu au survol
    columns.tsx         colonnes des cotes, une liste par mode
    grid-columns.ts     colonnes-facettes de la grille (ne rendent rien)
    card-grid.tsx       grille de cartes, quatre colonnes au plus
    card-dialog.tsx     versions d'une carte, en modale
    collection-control.tsx  quantité possédée d'une version, retrait en deux temps
    collection-stats.tsx    complétion en tête de la collection
    import-dialog.tsx   formats reconnus et zone de dépôt
    facet-filter.tsx    filtre à facette générique (menu à cases à cocher)
    sort-menu.tsx       menu de tri de la grille
    netdeck-view.tsx    vue base de cartes et collection
    data-table.tsx      rendu de la table depuis l'instance TanStack
    filters-bar.tsx     recherche, onglets, combobox, cases à cocher
    extension-combobox.tsx
    code-badge.tsx
    settings-view.tsx   codes d'impression, sauvegarde de la collection
    stats-strip.tsx
  data/
    dataset.json        jeu de données embarqué (généré, versionné)
    expansions.ts       libellés d'extensions, codes d'impression, URLs externes
    rarities.ts         taxonomie des raretés et leur rang de tri
    colors.ts           couleurs de carte du jeu → tokens CSS
    cardmarket.ts       URLs des trois exports — script, relais et bouton
  hooks/
    use-dataset.ts      état des données et imports
    use-table.ts        instance TanStack : tri, filtres, recherche
    use-theme.ts
    use-mobile.ts       requis par sidebar.tsx
  lib/
    csv.ts              export CSV depuis l'instance de table
    store.ts            conservation dans IndexedDB : imports, codes, collection
    views.ts            registre des vues
    dataset.ts          construction des lignes et regroupement par carte
    enrich.ts           jointure Netdeck ↔ Cardmarket
    modes.ts            registre des modes d'affichage
    facets.ts           registre des facettes de la grille
    sorts.ts            registre des tris de la grille, et rangs couleur/type
    printings.ts        impressions Netdeck et regroupement par carte
    collection.ts       quantités, grille par version, orphelines, complétion
    table.ts            tri, filtres et recherche passés à TanStack
    format.ts           formatage et normalisation
    ingest.ts           lecture des formats JSON, registre des formats, sauvegarde
    remote.ts           téléchargement à chaud des exports, et ses gardes
    utils.ts            cn()
  test/
    fixtures.ts         jeu synthétique des tests
    table.ts            instances TanStack headless : table des cotes et grille
  App.tsx
  index.css             tokens du thème, couleurs de carte, polices
  main.tsx
  types.ts
```

Les scripts de données sont en TypeScript, lancés par `tsx` : ils importent
`src/` par l'alias `@/`, si bien que la lecture des exports Cardmarket n'existe
qu'une fois, dans `lib/ingest.ts`. `netdeck-export.mjs` reste en JavaScript : il
ne partage rien avec `src/`.

Découpage : `lib/` ne contient que des fonctions pures, testables sans DOM ;
`hooks/` porte l'état ; `components/` ne fait que du rendu. Chaque fichier
s'ouvre sur un en-tête qui dit ce qu'il fait — sauf ceux du registry shadcn,
laissés intacts pour rester régénérables par la CLI.

## Sources de données

Trois sources, toutes publiques.

1. **Cardmarket** — cotes et catalogue. Trois exports JSON récupérés par
      `npm run data:fetch`, convertis par `npm run data:cardmarket` — ou appliqués
   sans quitter l'app par « Actualiser les données ». Price guide mis à jour
   quotidiennement.
2. **Netdeck** (`api.netdeck.gg`) — numéros de collecteur, raretés, visuels.
   Extraits par `npm run data:netdeck`, chargés à chaud.
3. **Import à chaud** — le bouton « Importer un JSON » accepte quatre formats,
   reconnus à leur clé racine : `products`, `priceGuides`, `cards`, et
   `collection` pour une sauvegarde. Les imports sont conservés dans ce
   navigateur (IndexedDB) et survivent au rechargement. Paramètres → « Oublier
   les données conservées » repart du jeu embarqué, sans toucher à la
   collection.

## Limites connues des données

- Cardmarket ne publie **ni numéro de collecteur ni rareté**. Deux impressions
  d'une même carte dans une même extension sont indiscernables sans
  l'enrichissement Netdeck.
- Les colonnes `avg1`, `avg7`, `avg30` et leurs équivalents foil sont **vides à
  100 %** dans l'export, et `trend-foil` ne vaut jamais autre chose que 0 : elles
  ne sont pas affichées.
- `low` est le prix de la plus petite annonce, pas une cote ni un prix de vente.
  Sur un marché à trois annonces, c'est du bruit. `trend` est plus honnête.
- **Les variantes d'une même carte dans une même extension sont indistinguables**
  côté Cardmarket : même nom, même extension, seul l'`idProduct` diffère. Cela
    concerne 37 cartes, soit 76 produits. Netdeck, lui, sépare ces variantes — une
  rareté de base et sa version Iconic ou Nova Rare, chacune avec son numéro et
  son visuel — mais rien ne relie une impression Netdeck à un `idProduct`. La
  colonne Rareté affiche donc les raretés possibles en pointillés plutôt que d'en
  choisir une.
- Les **codes d'impression** (MS01B, SD02B…) n'existent dans aucune source :
  seuls MS01B et SD02B sont confirmés, les autres sont déduits. Ils s'éditent
  dans Paramètres et se figent dans `src/data/expansions.ts`.
- Les extensions **6717** (« Box Toppers — Beta ») et **6719** (« Set 1 Promos »)
  n'ont aucun produit scellé : leur nom vient des sets Netdeck, mais leur code
  d'impression reste inconnu.

## Thème

Tokens shadcn/ui : base **Slate**, accent **Yellow**, graphiques **Cyan**,
radius **0**, polices **Geist** et **Geist Mono**. Les valeurs OKLCH sont celles
du registry officiel, mappées à la main sur le scaffold de tokens dans
`src/index.css`. Pour appliquer un thème généré par le configurateur shadcn,
remplacer les blocs `:root` et `.dark`.

Les cinq `--chart-*` reprennent l'échelle Cyan de Tailwind — pas 5. 300 → 700 en
clair, 200 → 600 en sombre, où 700 tomberait à 52 % de clarté sur un fond
slate-950. Aucun graphique ne les consomme encore : ils sont là pour le jour où.

Le thème sombre s'écarte de Slate : fond et barre latérale sont en noir pur, pour
que rien ne dispute l'éclat des visuels de carte. Les couleurs des cartes (rouge,
jaune, vert, bleu) ont leurs propres tokens, réglés par thème pour rester
lisibles.

## Note sur le combobox

Le `Combobox` du registry shadcn (`multiple` + `ComboboxChips`) importe
`@base-ui/react` — c'est le seul composant du registry qui ne soit pas Radix. Ce
projet étant en Radix exclusivement, la sélection multiple est construite avec
`Popover` + `Command` + `Badge`, la recette combobox documentée côté Radix.
Pour passer au composant officiel : `npm i @base-ui/react`, récupérer
`combobox.tsx` et `input-group.tsx` du registry, et remplacer
`src/components/extension-combobox.tsx`.

## Licences

Geist et Geist Mono sont distribuées par Vercel sous SIL Open Font License 1.1.
Les visuels de cartes sont sous licence CD PROJEKT RED — usage local, pas de
redistribution.
