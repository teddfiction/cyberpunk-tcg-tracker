/**
 * Colonnes de la grille. Elles ne rendent rien — la grille dessine des tuiles —
 * mais elles portent les filtres, la recherche et l'export CSV, qui restent
 * ainsi la même mécanique TanStack que les tables.
 */
import type { ColumnDef } from "@tanstack/react-table"

import { MISSING, OWNED, OWNED_FACET } from "@/lib/collection"
import { COLOR_RANK, TYPE_RANK } from "@/lib/sorts"
import { filterAny, filterIn, sortRank, sortRarity, sortText } from "@/lib/table"
import type { GridCard } from "@/types"

/**
 * Valeurs manquantes en fin de tri ascendant, et ex æquo entre elles.
 *
 * Pas `"last"`, que prend la table des cotes : TanStack y répond « après » dans
 * les deux sens quand deux cartes n'ont pas de valeur, et ne consulte jamais le
 * critère suivant. Les cinq Legend jaunes sans coût n'étaient alors pas
 * départagées par leur nom. Avec `1`, elles sont ex æquo et le nom tranche.
 *
 * Contrepartie : en tri descendant, les cartes sans valeur passeraient en tête.
 * La grille ne trie ces colonnes qu'en ascendant — un test le vérifie.
 */
const MISSING_LAST = 1

export const GRID_COLUMNS: ColumnDef<GridCard>[] = [
  { id: "name", accessorKey: "name", header: "Carte", sortingFn: sortText },
  { id: "subname", accessorFn: (c) => c.subname ?? "", header: "Sous-titre" },
  {
    id: "color",
    accessorFn: (c) => c.color ?? "",
    header: "Couleur",
    filterFn: filterIn,
    sortingFn: sortRank(COLOR_RANK),
  },
  {
    id: "type",
    accessorFn: (c) => c.type ?? "",
    header: "Type",
    filterFn: filterIn,
    sortingFn: sortRank(TYPE_RANK),
  },
  {
    id: "tags",
    accessorKey: "tags",
    header: "Tags",
    filterFn: filterAny,
    meta: { csv: (c) => c.tags.join(" · ") },
  },
  {
    id: "cost",
    accessorFn: (c) => c.cost ?? undefined,
    header: "Coût",
    filterFn: filterIn,
    sortUndefined: MISSING_LAST,
    meta: { align: "right" },
  },
  {
    id: "power",
    accessorFn: (c) => c.power ?? undefined,
    header: "Puissance",
    filterFn: filterIn,
    sortUndefined: MISSING_LAST,
    meta: { align: "right" },
  },
  {
    id: "ram",
    accessorFn: (c) => c.ram ?? undefined,
    header: "RAM",
    filterFn: filterIn,
    sortUndefined: MISSING_LAST,
    meta: { align: "right" },
  },
  {
    id: "eddiable",
    accessorFn: (c) => (c.eddiable ? "Oui" : "Non"),
    header: "Eddies",
    filterFn: filterIn,
  },
  {
    id: "sets",
    accessorKey: "sets",
    header: "Sets",
    filterFn: filterAny,
    meta: { csv: (c) => c.sets.join(" · ") },
  },
  {
    id: "rarities",
    accessorKey: "rarities",
    header: "Raretés",
    filterFn: filterAny,
    sortingFn: sortRarity,
    meta: { csv: (c) => c.rarities.join(" · ") },
  },
  {
    id: "num",
    accessorFn: (c) => c.printings.find((p) => p.num)?.num ?? undefined,
    header: "N°",
    sortingFn: sortText,
    sortUndefined: MISSING_LAST,
  },
  {
    id: "printings",
    accessorFn: (c) => c.printings.length,
    header: "Impressions",
    meta: { align: "right" },
  },
  {
    id: "low",
    accessorFn: (c) => c.low ?? undefined,
    header: "Mini Cardmarket",
    sortUndefined: MISSING_LAST,
    meta: { align: "right", decimal: true },
  },
  // Deux colonnes pour une donnée : l'une filtre en Possédée / Manquante — le
  // sélecteur de la collection —, l'autre trie et s'exporte en nombre. Le CSV
  // n'en garde qu'une.
  {
    id: OWNED_FACET,
    accessorFn: (c) => (c.owned > 0 ? OWNED : MISSING),
    header: "Collection",
    filterFn: filterIn,
    meta: { noCsv: true },
  },
  {
    id: "qty",
    accessorFn: (c) => c.owned,
    header: "Exemplaires",
    meta: { align: "right" },
  },
]
