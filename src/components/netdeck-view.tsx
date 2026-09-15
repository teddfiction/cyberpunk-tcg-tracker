/**
 * Base de cartes Netdeck : la grille des cartes officielles, filtrable.
 *
 * Elle montre ce que la table des cotes ne peut pas montrer — les cartes
 * qu'aucun vendeur ne propose, et les artworks de chaque variante. La cote
 * Cardmarket y est un complément, rattaché quand il est attribuable.
 *
 * Le filtrage et la recherche passent par TanStack, comme les tables : les
 * colonnes de `grid-columns.ts` ne rendent rien, elles portent les facettes.
 */
import * as React from "react"
import { Download, RotateCcw, Search, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardGrid } from "@/components/card-grid"
import { FacetFilter } from "@/components/facet-filter"
import { GRID_COLUMNS } from "@/components/grid-columns"
import { useTable } from "@/hooks/use-table"
import { download, toCsv } from "@/lib/csv"
import { FACETS, facetOptions } from "@/lib/facets"
import { buildGrid, buildPrintings, searchCard } from "@/lib/printings"
import type { CodeMap, EnrichedCard, Row } from "@/types"

type Props = {
  cards: EnrichedCard[] | null
  rows: Row[]
  codes: CodeMap
  expansions: Record<string, string>
  onImport: () => void
}

export function NetdeckView({ cards, rows, codes, expansions, onImport }: Props) {
  const grid = React.useMemo(() => {
    const printings = buildPrintings({ cards, rows, expansions, codes })
    return buildGrid(cards, printings)
  }, [cards, rows, expansions, codes])

  const table = useTable({
    data: grid,
    columns: GRID_COLUMNS,
    defaultSort: "name",
    defaultDesc: false,
    getRowId: (c) => c.name,
    globalFilterFn: searchCard,
    meta: { codes, expansions },
  })

  // Comptées sur toutes les cartes : cocher une option ne doit pas faire
  // disparaître les autres, sinon on ne peut plus élargir sa sélection.
  const options = React.useMemo(
    () => FACETS.map((facet) => ({ facet, options: facetOptions(facet, grid) })),
    [grid]
  )

  if (!grid.length) return <EmptyState onImport={onImport} />

  const search = (table.getState().globalFilter as string) ?? ""
  const visible = table.getRowModel().rows.map((r) => r.original)
  const filtering = table.getState().columnFilters.length > 0 || search.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            placeholder="Chercher un nom, un tag, un set, une rareté…"
            className="pl-8"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => download("cyberpunk-tcg-cartes.csv", toCsv(table, codes))}
        >
          <Download />
          <span className="hidden sm:inline">Exporter en CSV</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {options.map(({ facet, options: values }) => (
          <FacetFilter
            key={facet.id}
            label={facet.label}
            options={values}
            selected={(table.getColumn(facet.id)?.getFilterValue() as string[]) ?? []}
            onChange={(next) =>
              table.getColumn(facet.id)?.setFilterValue(next.length ? next : undefined)
            }
          />
        ))}

        {filtering && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              table.resetColumnFilters()
              table.resetGlobalFilter()
            }}
          >
            <RotateCcw />
            Réinitialiser
          </Button>
        )}

        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {visible.length} / {grid.length} cartes ·{" "}
          {visible.reduce((n, c) => n + c.printings.length, 0)} impressions
        </span>
      </div>

      <CardGrid cards={visible} codes={codes} expansions={expansions} />

      <p className="text-muted-foreground text-xs leading-relaxed">
        Source : <code>api.netdeck.gg</code> via <code>npm run data:netdeck:images</code>. Cliquer
        une carte déplie ses impressions. La cote Cardmarket n'est rattachée que lorsqu'un seul
        produit correspond à cette carte dans cette extension ; sinon la fourchette est affichée en
        pointillés — rien ne dit lequel est cette impression précise.
      </p>
    </div>
  )
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 border p-6">
      <div>
        <h2 className="text-sm font-medium">Aucune carte chargée</h2>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm leading-relaxed">
          La base de cartes vient de Netdeck, pas de Cardmarket : elle n'est pas embarquée dans
          l'app. Générer <code>cards_enriched.json</code> avec{" "}
          <code>npm run data:netdeck:images</code>, puis l'importer ici. Le fichier est ensuite
          conservé dans ce navigateur.
        </p>
      </div>
      <Button size="sm" onClick={onImport}>
        <Upload />
        Importer un JSON
      </Button>
    </div>
  )
}
