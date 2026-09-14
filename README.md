# Cyberpunk TCG — cotes Cardmarket

Consultation des cotes Cardmarket du Cyberpunk TCG (WeirdCo) : recherche, filtres,
tri, regroupement par carte, export CSV.

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (primitives Radix UI)
· TanStack Table v8.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
npm run typecheck
```

Le dépôt embarque un jeu de données (`src/data/dataset.json`) : l'app tourne
immédiatement, sans téléchargement préalable. La section suivante décrit comment
le rafraîchir.

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
suffit : bouton « Importer un JSON » dans l'app. L'import ne vit qu'en mémoire.

### 2. Enrichir : numéros de collecteur, raretés, visuels

Cardmarket ne publie ni numéro de collecteur ni rareté. L'API Netdeck les fournit.

```bash
npm run data:netdeck           # métadonnées seules
npm run data:netdeck:images    # + miniatures webp base64 (npm i sharp)
```

Produit `cards_enriched.json` à la racine (non versionné). Le charger via
« Importer un JSON » : la colonne « N° » apparaît, les raretés s'affichent sous le
nom du produit, les miniatures dans la colonne Produit.

L'API `api.netdeck.gg` restreint le CORS à `https://cyberpunktcg.com` : l'appel doit
partir d'un script Node avec l'en-tête `Origin`, jamais du navigateur. Si le schéma
a changé, `node scripts/netdeck-export.mjs --raw` dumpe la réponse brute à inspecter.

### 3. Figer les codes d'impression

Les codes (MS01B, SD02B…) n'existent dans aucune source et sont saisis à la main.

1. Onglet **Paramètres**, renseigner le code de chaque extension. Toute saisie vaut
   confirmation : le badge passe de pointillés à plein.
2. **Copier le mapping JSON**.
3. Reporter le résultat dans `DEFAULT_CODES` (`src/data/expansions.ts`) et committer.

Sans cette étape, les saisies sont perdues au rechargement.

### 4. Exporter

Bouton **Exporter en CSV** : colonnes du mode courant, lignes filtrées et triées
telles qu'affichées. Séparateur `;`, virgule décimale, BOM UTF-8 — Excel FR ouvre
le fichier sans assistant d'import.

### Cycle type

| Quand | Quoi |
|---|---|
| Suivi régulier des cotes | `npm run data:refresh`, puis committer `src/data/dataset.json` |
| Nouvelle extension | `npm run data:refresh`, puis `npm run data:netdeck`, compléter `EXPANSIONS` puis `DEFAULT_CODES` |
| Vérification ponctuelle | import à chaud dans l'app, rien à committer |

## Structure

```
data/cardmarket/        exports bruts Cardmarket — non versionné, entrée du pipeline
public/fonts/           Geist Variable (woff2)
scripts/
  fetch-cardmarket.mjs  téléchargement des exports Cardmarket
  build-dataset.mjs     exports Cardmarket  →  src/data/dataset.json
  netdeck-export.mjs    API cyberpunktcg.com →  cards_enriched.json
src/
  components/
    ui/                 composants shadcn/ui, registry new-york-v4, non modifiés
    app-sidebar.tsx     navigation, import, bascule de thème
    columns.tsx         définition des colonnes TanStack, une liste par mode
    data-table.tsx      rendu de la table depuis l'instance TanStack
    filters-bar.tsx     recherche, onglets, combobox, cases à cocher
    extension-combobox.tsx
    code-badge.tsx
    settings-view.tsx   édition des codes d'impression
    stats-strip.tsx
  data/
    dataset.json        jeu de données embarqué (généré, versionné)
    expansions.ts       libellés d'extensions, codes d'impression, URLs externes
  hooks/
    use-dataset.ts      état des données et imports
    use-table.ts        instance TanStack : tri, filtres, recherche
    use-theme.ts
    use-mobile.ts       requis par sidebar.tsx
  lib/
    csv.ts              export CSV depuis l'instance de table
    dataset.ts          construction des lignes et regroupement par carte
    enrich.ts           jointure Netdeck ↔ Cardmarket
    table.ts            tri, filtres et recherche passés à TanStack
    format.ts           formatage et normalisation
    ingest.ts           lecture des trois formats JSON
    utils.ts            cn()
  App.tsx
  index.css             tokens du thème
  main.tsx
  types.ts
```

Découpage : `lib/` ne contient que des fonctions pures, testables sans DOM ;
`hooks/` porte l'état ; `components/` ne fait que du rendu. Chaque fichier
s'ouvre sur un en-tête qui dit ce qu'il fait — sauf ceux du registry shadcn,
laissés intacts pour rester régénérables par la CLI.

## Sources de données

Trois sources, toutes publiques.

1. **Cardmarket** — cotes et catalogue. Trois exports JSON récupérés par
   `npm run data:fetch`, convertis par `npm run data:cardmarket`.
   Price guide mis à jour quotidiennement.
2. **Netdeck** (`api.netdeck.gg`) — numéros de collecteur, raretés, visuels.
   Extraits par `npm run data:netdeck`, chargés à chaud.
3. **Import à chaud** — le bouton « Importer un JSON » accepte les trois formats,
   reconnus à leur clé racine : `priceGuides`, `products`, `cards`. Les imports
   vivent en mémoire ; recharger la page revient au jeu embarqué.

## Limites connues des données

- Cardmarket ne publie **ni numéro de collecteur ni rareté**. Deux impressions
  d'une même carte dans une même extension sont indiscernables sans
  l'enrichissement Netdeck.
- Les colonnes `avg1`, `avg7`, `avg30` et leurs équivalents foil sont **vides à
  100 %** dans l'export, `trend-foil` vaut 0 partout : elles ne sont pas affichées.
- `low` est le prix de la plus petite annonce, pas une cote ni un prix de vente.
  Sur un marché à trois annonces, c'est du bruit. `trend` est plus honnête.
- Les **codes d'impression** (MS01B, SD02B…) n'existent dans aucune source :
  seuls MS01B et SD02B sont confirmés, les autres sont déduits. Ils s'éditent
  dans Paramètres et se figent dans `src/data/expansions.ts`.
- Les extensions **6717** et **6719** n'ont aucun produit scellé associé : leur
  nom reste inconnu. L'export Netdeck devrait les identifier.

## Thème

Tokens shadcn/ui : base **Mist**, accent **Yellow**, radius **0**, police
**Geist**. Les valeurs OKLCH sont celles du registry officiel, mappées à la main
sur le scaffold de tokens dans `src/index.css`. Pour appliquer un thème généré
par le configurateur shadcn, remplacer les blocs `:root` et `.dark`.

## Note sur le combobox

Le `Combobox` du registry shadcn (`multiple` + `ComboboxChips`) importe
`@base-ui/react` — c'est le seul composant du registry qui ne soit pas Radix. Ce
projet étant en Radix exclusivement, la sélection multiple est construite avec
`Popover` + `Command` + `Badge`, la recette combobox documentée côté Radix.
Pour passer au composant officiel : `npm i @base-ui/react`, récupérer
`combobox.tsx` et `input-group.tsx` du registry, et remplacer
`src/components/extension-combobox.tsx`.

## Licences

Geist est distribuée par Vercel sous SIL Open Font License. Les visuels de
cartes sont sous licence CD PROJEKT RED — usage local, pas de redistribution.
