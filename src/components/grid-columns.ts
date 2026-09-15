/**
 * Colonnes de la grille. Elles ne rendent rien — la grille dessine des tuiles —
 * mais elles portent les filtres, la recherche et l'export CSV, qui restent
 * ainsi la même mécanique TanStack que les tables.
 */
import type { ColumnDef } from "@tanstack/react-table"

import { filterAny, filterIn, sortText } from "@/lib/table"
import type { GridCard } from "@/types"

export const GRID_COLUMNS: ColumnDef<GridCard>[] = [
  { id: "name", accessorKey: "name", header: "Carte", sortingFn: sortText },
  { id: "subname", accessorFn: (c) => c.subname ?? "", header: "Sous-titre" },
  { id: "color", accessorFn: (c) => c.color ?? "", header: "Couleur", filterFn: filterIn },
  { id: "type", accessorFn: (c) => c.type ?? "", header: "Type", filterFn: filterIn },
  {
    id: "tags",
    accessorKey: "tags",
    header: "Tags",
    filterFn: filterAny,
    meta: { csv: (c) => c.tags.join(" · ") },
  },
  { id: "cost", accessorFn: (c) => c.cost ?? "", header: "Coût", filterFn: filterIn },
  { id: "power", accessorFn: (c) => c.power ?? "", header: "Puissance", filterFn: filterIn },
  { id: "ram", accessorFn: (c) => c.ram ?? "", header: "RAM", filterFn: filterIn },
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
    meta: { csv: (c) => c.rarities.join(" · ") },
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
    sortUndefined: "last",
    meta: { align: "right", decimal: true },
  },
]
