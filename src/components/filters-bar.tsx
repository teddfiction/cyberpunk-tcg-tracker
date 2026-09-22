/**
 * Barre de filtres : recherche, mode d'affichage, extensions, bascules.
 * Lit et écrit directement dans l'instance TanStack — aucun état local.
 * Mêmes commandes que la grille de cartes (`controls.tsx`, `ActionButton`).
 */
import type { Table } from "@tanstack/react-table"
import { Download, RotateCcw, Upload } from "lucide-react"

import { ActionButton } from "@/components/action-button"
import { ChoiceGroup, FilterToggle, SearchField } from "@/components/controls"
import { CountLine } from "@/components/count-line"
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

/** Les options du sélecteur de mode, dans l'ordre du registre. */
const MODE_CHOICES = MODE_IDS.map((id) => ({ value: id, label: MODES[id].label }))

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
        <SearchField
          value={search}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          placeholder="Chercher une carte, un code, un ID…"
          className="min-w-56 flex-1"
        />

        <ChoiceGroup label="Mode d'affichage" choices={MODE_CHOICES} value={mode} onChange={onMode} />

        <ActionButton onClick={onExport}>
          <Download />
          <span className="hidden sm:inline">Exporter en CSV</span>
        </ActionButton>
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
          <ActionButton className="ml-auto" onClick={onImport}>
            <Upload />
            Importer
          </ActionButton>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <ExtensionCombobox
          options={options}
          selected={selected}
          onChange={(next) => table.getColumn("exps")?.setFilterValue(next)}
          codes={codes}
          expansions={expansions}
        />

        {FLAGS.map(({ id, label }) => (
          <FilterToggle
            key={id}
            pressed={table.getColumn(id)?.getFilterValue() === true}
            // `undefined` retire le filtre : TanStack ne garde que les filtres actifs.
            onPressedChange={(v) => table.getColumn(id)?.setFilterValue(v ? true : undefined)}
          >
            {label}
          </FilterToggle>
        ))}

        {/* En dernier sur la dernière ligne de commandes, comme dans la grille. */}
        <ActionButton tone="secondary" onClick={reset}>
          <RotateCcw />
          Réinitialiser
        </ActionButton>
      </div>

      {/* Sous les commandes, seul sur sa ligne : c'est ce qu'annonce la table. */}
      <CountLine>
        {shown} / {total} {MODES[mode].noun}
      </CountLine>
    </div>
  )
}
