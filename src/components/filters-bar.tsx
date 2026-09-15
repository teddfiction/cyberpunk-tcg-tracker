/**
 * Barre de filtres : recherche, mode d'affichage, extensions, cases à cocher.
 * Lit et écrit directement dans l'instance TanStack — aucun état local.
 */
import type { Table } from "@tanstack/react-table"
import { RotateCcw, Search } from "lucide-react"

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
      </div>

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
