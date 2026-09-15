/**
 * Barre de filtres : recherche, mode d'affichage, extensions, cases à cocher.
 * Lit et écrit directement dans l'instance TanStack — aucun état local.
 */
import type { Table } from "@tanstack/react-table"
import { Download, RotateCcw, Search, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExtensionCombobox } from "@/components/extension-combobox"
import { MODES, MODE_IDS, type Mode } from "@/lib/modes"
import type { CodeMap, TableRow } from "@/types"

type Props = {
  table: Table<TableRow>
  mode: Mode
  onMode: (m: Mode) => void
  options: { exp: string; count: number }[]
  codes: CodeMap
  expansions: Record<string, string>
  shown: number
  total: number
  onExport: () => void
  /** Faux tant que `cards_enriched.json` n'est pas chargé. */
  enriched: boolean
  onImport: () => void
}

const FLAGS = [
  { id: "priced", label: "Masquer les lignes sans prix" },
  { id: "single", label: "Singles uniquement" },
] as const

export function FiltersBar({
  table,
  mode,
  onMode,
  options,
  codes,
  expansions,
  shown,
  total,
  onExport,
  enriched,
  onImport,
}: Props) {
  const search = (table.getState().globalFilter as string) ?? ""
  const selected = (table.getColumn("exps")?.getFilterValue() as string[]) ?? []

  const reset = () => {
    table.resetGlobalFilter()
    table.resetColumnFilters()
    table.resetSorting()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            placeholder="Chercher une carte, un code, un ID…"
            className="pl-8"
          />
        </div>

        <Tabs value={mode} onValueChange={(v) => onMode(v as Mode)}>
          <TabsList>
            {MODE_IDS.map((id) => (
              <TabsTrigger key={id} value={id}>
                {MODES[id].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" onClick={onExport}>
          <Download />
          <span className="hidden sm:inline">Exporter en CSV</span>
        </Button>
      </div>

      {/* Trois colonnes dorment derrière le bouton d'import : le dire, sinon
          personne ne les découvre. */}
      {!enriched && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 border border-dashed px-3 py-2 text-xs">
          <span>
            Visuel, N° de collecteur et Rareté apparaissent une fois{" "}
            <code>cards_enriched.json</code> importé — voir{" "}
            <code>npm run data:netdeck:images</code>.
          </span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onImport}>
            <Upload />
            Importer
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <ExtensionCombobox
          options={options}
          selected={selected}
          onChange={(next) => table.getColumn("exps")?.setFilterValue(next)}
          codes={codes}
          expansions={expansions}
        />

        {FLAGS.map(({ id, label }) => (
          <div key={id} className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={table.getColumn(id)?.getFilterValue() === true}
              // `undefined` retire le filtre : TanStack ne garde que les filtres actifs.
              onCheckedChange={(v) => table.getColumn(id)?.setFilterValue(v ? true : undefined)}
            />
            <Label htmlFor={id} className="font-normal">
              {label}
            </Label>
          </div>
        ))}

        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw />
          Réinitialiser
        </Button>

        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {shown} / {total} {MODES[mode].noun}
        </span>
      </div>
    </div>
  )
}
