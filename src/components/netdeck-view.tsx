/**
 * Base de cartes Netdeck : une ligne par impression, la source officielle.
 *
 * Elle montre ce que la table des cotes ne peut pas montrer — les cartes
 * qu'aucun vendeur ne propose, et la rareté de chaque impression sans détour.
 * La cote Cardmarket y est un complément, rattaché quand il est attribuable.
 */
import * as React from "react"
import { Download, Search, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/data-table"
import { PRINTING_COLUMNS } from "@/components/printing-columns"
import { useTable } from "@/hooks/use-table"
import { download, toCsv } from "@/lib/csv"
import { buildPrintings, printingId, searchPrinting } from "@/lib/printings"
import type { CodeMap, EnrichedCard, Row } from "@/types"

type Props = {
  cards: EnrichedCard[] | null
  rows: Row[]
  codes: CodeMap
  expansions: Record<string, string>
  onImport: () => void
}

export function NetdeckView({ cards, rows, codes, expansions, onImport }: Props) {
  const printings = React.useMemo(
    () => buildPrintings({ cards, rows, expansions, codes }),
    [cards, rows, expansions, codes]
  )

  const table = useTable({
    data: printings,
    columns: PRINTING_COLUMNS,
    defaultSort: "name",
    defaultDesc: false,
    getRowId: printingId,
    globalFilterFn: searchPrinting,
    meta: { codes, expansions },
  })

  if (!printings.length) return <EmptyState onImport={onImport} />

  const search = (table.getState().globalFilter as string) ?? ""
  const shown = table.getRowModel().rows.length
  const priced = printings.filter((p) => p.low != null || p.lowRange).length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-px border md:grid-cols-4">
        <Stat value={new Set(printings.map((p) => p.name)).size} label="cartes" />
        <Stat value={printings.length} label="impressions" />
        <Stat value={new Set(printings.map((p) => p.set)).size} label="sets" />
        <Stat value={priced} label="impressions avec une cote" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            placeholder="Chercher un nom, un set, une rareté, un artiste…"
            className="pl-8"
          />
        </div>

        <span className="text-muted-foreground text-xs tabular-nums">
          {shown} / {printings.length} impressions
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => download("cyberpunk-tcg-impressions.csv", toCsv(table, codes))}
        >
          <Download />
          <span className="hidden sm:inline">Exporter en CSV</span>
        </Button>
      </div>

      <DataTable table={table} />

      <p className="text-muted-foreground text-xs leading-relaxed">
        Source : <code>api.netdeck.gg</code> via <code>npm run data:netdeck</code>. La cote
        Cardmarket n'est rattachée que lorsqu'un seul produit correspond à cette carte dans cette
        extension ; quand plusieurs se partagent le nom, la fourchette est affichée en pointillés
        — rien ne dit lequel est cette impression précise.
      </p>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-card p-3">
      <div className="text-xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
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
