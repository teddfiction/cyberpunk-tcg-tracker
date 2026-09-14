# Cyberpunk TCG — cotes Cardmarket

Consultation des cotes Cardmarket du Cyberpunk TCG (WeirdCo) : recherche, filtres,
tri, regroupement par carte, export CSV.

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui (primitives Radix UI).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
npm run typecheck
```

## Structure

```
data/cardmarket/        exports bruts Cardmarket (entrée du pipeline)
public/fonts/           Geist Variable (woff2)
scripts/
  build-dataset.mjs     exports Cardmarket  →  src/data/dataset.json
  netdeck-export.mjs    API cyberpunktcg.com →  cards_enriched.json
src/
  components/
    ui/                 composants shadcn/ui, registry new-york-v4, non modifiés
    app-sidebar.tsx     navigation, import, bascule de thème
    data-table.tsx      table + rendu des cellules
    filters-bar.tsx     recherche, onglets, combobox, cases à cocher
    extension-combobox.tsx
    code-badge.tsx
    settings-view.tsx   édition des codes d'impression
    stats-strip.tsx
  data/
    dataset.json        jeu de données embarqué (généré)
    expansions.ts       libellés d'extensions, codes d'impression, URLs externes
  hooks/
    use-dataset.ts      état des données et imports
    use-filters.ts      état des filtres, tri, colonnes
    use-theme.ts
    use-mobile.ts       requis par sidebar.tsx
  lib/
    columns.ts          définition des colonnes par mode
    csv.ts              export CSV
    dataset.ts          construction des lignes, regroupement, filtrage, tri
    enrich.ts           jointure Netdeck ↔ Cardmarket
    format.ts           formatage et normalisation
    ingest.ts           lecture des trois formats JSON
    utils.ts            cn()
  App.tsx
  index.css             tokens du thème
  main.tsx
  types.ts
```

Découpage : `lib/` ne contient que des fonctions pures, testables sans DOM ;
`hooks/` porte l'état ; `components/` ne fait que du rendu. La logique de
jointure et de tri est isolée dans `lib/dataset.ts` et `lib/enrich.ts`.

## Données

Trois sources, toutes publiques.

**1. Cardmarket — cotes et catalogue.** Télécharger dans `data/cardmarket/` :

```
https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_23.json
https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_23.json
https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_23.json
```

puis `npm run data:cardmarket` pour régénérer `src/data/dataset.json`.
Le price guide est mis à jour quotidiennement.

**2. Netdeck — numéros de collecteur, raretés, visuels.**

```bash
npm run data:netdeck           # métadonnées
npm run data:netdeck:images    # + miniatures base64 (npm i sharp)
node scripts/netdeck-export.mjs --raw     # dump brut si le schéma a changé
```

Produit `cards_enriched.json` à charger via « Importer un JSON ». L'API
`api.netdeck.gg` restreint le CORS à `https://cyberpunktcg.com` : l'appel doit
venir d'un script Node, pas du navigateur.

**3. Import à chaud.** Le bouton « Importer un JSON » accepte les trois formats,
reconnus à leur clé racine : `priceGuides`, `products`, `cards`. Les imports
vivent en mémoire — recharger la page revient au jeu embarqué.

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
