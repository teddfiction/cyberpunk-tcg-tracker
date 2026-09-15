/**
 * Colonnes de la base de cartes. Une ligne = une impression Netdeck.
 * Le tri et la recherche viennent de `lib/printings.ts`.
 */
import type { ColumnDef } from "@tanstack/react-table"

import { CardThumb } from "@/components/card-thumb"
import { CodeBadge } from "@/components/code-badge"
import { rarityLabel, rarityRank } from "@/data/rarities"
import { cyberpunkTcgUrl } from "@/data/expansions"
import { eur } from "@/lib/format"
import { sortText } from "@/lib/table"
import type { PrintRow } from "@/types"

const dash = <span className="text-muted-foreground/50">—</span>

const number = (
  id: string,
  header: string,
  get: (p: PrintRow) => number | null
): ColumnDef<PrintRow> => ({
  id,
  accessorFn: (p) => get(p) ?? undefined,
  header,
  sortUndefined: "last",
  meta: { align: "right" },
  cell: ({ getValue }) => getValue<number | undefined>() ?? dash,
})

export const PRINTING_COLUMNS: ColumnDef<PrintRow>[] = [
  {
    id: "thumb",
    header: "",
    enableSorting: false,
    meta: { className: "w-[44px]", noCsv: true },
    cell: ({ row }) => <CardThumb thumb={row.original.thumb} name={row.original.name} />,
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Carte",
    sortingFn: sortText,
    meta: { className: "max-w-[280px] min-w-[180px]" },
    cell: ({ row }) => {
      const p = row.original
      return (
        <div className="min-w-0">
          {p.slug ? (
            <a
              href={cyberpunkTcgUrl(p.slug, p.uuid)}
              target="_blank"
              rel="noopener"
              className="block truncate font-medium hover:underline"
            >
              {p.name}
            </a>
          ) : (
            <span className="block truncate font-medium">{p.name}</span>
          )}
          <span className="text-muted-foreground block truncate text-xs">
            {[p.type, p.color, p.artist].filter(Boolean).join(" · ")}
          </span>
        </div>
      )
    },
  },
  {
    id: "num",
    accessorFn: (p) => p.num ?? undefined,
    header: "N°",
    sortingFn: sortText,
    sortUndefined: "last",
    meta: { className: "text-muted-foreground font-mono text-xs whitespace-nowrap" },
    cell: ({ getValue }) => {
      const v = getValue<string | undefined>()
      return v ? `#${v}` : dash
    },
  },
  {
    id: "rarity",
    accessorFn: (p) => (p.rarity ? rarityRank(p.rarity) : undefined),
    header: "Rareté",
    sortUndefined: "last",
    meta: { className: "text-xs whitespace-nowrap", csv: (p) => p.rarity ?? "" },
    cell: ({ row }) => (row.original.rarity ? rarityLabel(row.original.rarity) : dash),
  },
  {
    id: "set",
    accessorKey: "set",
    header: "Set",
    sortingFn: sortText,
    meta: { className: "max-w-[220px] truncate text-sm" },
    cell: ({ getValue }) => getValue<string>(),
  },
  {
    id: "code",
    accessorKey: "code",
    header: "Code",
    sortingFn: sortText,
    cell: ({ row, table }) => {
      const p = row.original
      if (!p.exp) return dash
      const meta = table.options.meta
      return <CodeBadge exp={p.exp} codes={meta!.codes} expansions={meta!.expansions} />
    },
  },
  number("cost", "Coût", (p) => p.cost),
  number("power", "Force", (p) => p.power),
  number("ram", "RAM", (p) => p.ram),
  {
    /**
     * Cote Cardmarket. Exacte quand un seul produit correspond ; sinon une
     * fourchette en pointillés, parce que rien ne dit lequel est cette
     * impression. Le tri se fait sur le bas de fourchette.
     */
    id: "low",
    accessorFn: (p) => p.low ?? p.lowRange?.[0] ?? undefined,
    header: "Mini Cardmarket",
    sortUndefined: "last",
    meta: {
      align: "right",
      decimal: true,
      csv: (p) =>
        p.low != null
          ? p.low.toFixed(2).replace(".", ",")
          : p.lowRange
            ? `${p.lowRange[0].toFixed(2)}–${p.lowRange[1].toFixed(2)}`.replace(/\./g, ",")
            : "",
    },
    cell: ({ row }) => {
      const p = row.original
      if (p.low != null) return eur(p.low)
      if (!p.lowRange) return dash
      return (
        <span
          className="text-muted-foreground underline decoration-dotted underline-offset-2"
          title={`${p.variants} produits Cardmarket partagent ce nom dans cette extension : la cote de cette impression précise n'est pas isolable.`}
        >
          {eur(p.lowRange[0])} – {eur(p.lowRange[1])}
        </span>
      )
    },
  },
]
