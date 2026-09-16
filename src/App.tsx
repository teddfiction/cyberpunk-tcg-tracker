/**
 * Assemblage de l'app : données, vue courante, chrome autour.
 * Aucune logique métier ici — tout vient des hooks et de lib/.
 */
import * as React from "react"
import { toast } from "sonner"

import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { AppSidebar } from "@/components/app-sidebar"
import { columnsFor } from "@/components/columns"
import { DataTable } from "@/components/data-table"
import { FiltersBar } from "@/components/filters-bar"
import { NetdeckView } from "@/components/netdeck-view"
import { SettingsView } from "@/components/settings-view"
import { StatsStrip } from "@/components/stats-strip"
import { useDataset } from "@/hooks/use-dataset"
import { useTable } from "@/hooks/use-table"
import { useTheme } from "@/hooks/use-theme"
import { download, toCsv } from "@/lib/csv"
import { dateAbbr, sentences } from "@/lib/format"
import { MODES, type Mode } from "@/lib/modes"
import { HIDDEN_COLUMNS, INITIAL_FILTERS, rowId, searchRow } from "@/lib/table"
import { VIEWS, type View } from "@/lib/views"

export default function App() {
  const data = useDataset()
  const { dark, toggle } = useTheme()

  const [view, setView] = React.useState<View>("table")
  const [mode, setMode] = React.useState<Mode>("normal")
  const fileRef = React.useRef<HTMLInputElement>(null)
  const openImport = () => fileRef.current?.click()

  // useDataset rend un avis, App choisit comment le montrer — le hook n'importe
  // rien de sonner. setNotice pose un objet neuf à chaque fois, donc deux
  // imports au message identique déclenchent bien deux toasts.
  React.useEffect(() => {
    if (!data.notice) return
    const { tone, message } = data.notice
    // Dix secondes et un bouton de fermeture : un import de trois fichiers rend
    // quatre à six phrases, que les quatre secondes par défaut de sonner ne
    // laissaient pas le temps de lire. `whitespace-pre-line` fait rendre les
    // sauts de ligne posés par `sentences`, qui reste une transformation pure.
    ;(tone === "error" ? toast.error : toast.success)(sentences(message).join("\n"), {
      duration: 10_000,
      closeButton: true,
      className: "whitespace-pre-line",
    })
  }, [data.notice])

  const columns = React.useMemo(() => columnsFor(mode, data.enriched), [mode, data.enriched])
  const source = { rows: data.rows, cards: data.cards }[MODES[mode].source]
  const table = useTable({
    data: source,
    columns,
    defaultSort: MODES[mode].defaultSort,
    getRowId: rowId,
    globalFilterFn: searchRow,
    meta: { codes: data.codes, expansions: data.expansions },
    hidden: HIDDEN_COLUMNS,
    initialFilters: INITIAL_FILTERS,
  })

  const options = React.useMemo(
    () =>
      Object.entries(data.expCounts)
        .map(([exp, count]) => ({ exp, count }))
        .sort((a, b) => b.count - a.count),
    [data.expCounts]
  )

  /** `Record<View, …>` : ajouter une vue au registre sans son rendu ne compile pas. */
  const render: Record<View, () => React.ReactNode> = {
    table: () => (
      <>
        <StatsStrip rows={data.rows} cards={data.cards} />

        <FiltersBar
          table={table}
          mode={mode}
          onMode={setMode}
          options={options}
          codes={data.codes}
          expansions={data.expansions}
          shown={table.getRowModel().rows.length}
          total={source.length}
          onExport={() =>
            download(`cyberpunk-tcg-${mode}.csv`, toCsv(table, data.codes))
          }
          enriched={data.enriched}
          onImport={openImport}
        />

        <DataTable table={table} />

        <p className="text-muted-foreground text-xs leading-relaxed">
          Sources : exports publics Cardmarket joints sur <code>idProduct</code>, enrichis par
          l'API Netdeck via <code>npm run data:netdeck</code>. Les colonnes{" "}
          <code>avg1/avg7/avg30</code> et <code>trend-foil</code> sont vides ou constantes côté
          Cardmarket : elles ne sont pas affichées. <code>low</code> est la plus petite annonce,
          pas un prix de vente.
        </p>
      </>
    ),

    netdeck: () => (
      <NetdeckView
        cards={data.enrichedCards}
        rows={data.rows}
        codes={data.codes}
        expansions={data.expansions}
        onImport={openImport}
      />
    ),

    settings: () => (
      <SettingsView
        codes={data.codes}
        setCodes={data.setCodes}
        expansions={data.expansions}
        counts={data.expCounts}
        onMessage={(message) => data.setNotice({ tone: "ok", message })}
        storedAt={data.storedAt}
        onForget={() => void data.forget()}
      />
    ),
  }

  return (
    <SidebarProvider>
      <AppSidebar
        view={view}
        onView={setView}
        onImport={openImport}
        onRefresh={() => void data.refreshData()}
        fetching={data.fetching}
        dark={dark}
        onToggleTheme={toggle}
      />

      {/* `min-w-0` : sans lui, `SidebarInset` cumule `w-full` et `flex-1`, et sa
          largeur minimale automatique reste plafonnée à 100 % du conteneur. Il
          ne rétrécit alors jamais de la largeur de la barre latérale, et c'est
          la page entière qui défile — au lieu de la seule table, qui a son
          propre `overflow-x-auto`. */}
      <SidebarInset className="min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 !h-4" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium">{VIEWS[view].label}</h1>
            <p className="text-muted-foreground truncate text-xs">
              {data.rows.length} produits · {data.cards.length} cartes · Prix du{" "}
              {dateAbbr(data.pricesAt)} · Catalogue du {dateAbbr(data.catalogAt)}
            </p>
          </div>
        </header>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          multiple
          className="hidden"
          onChange={(e) => {
            void data.importFiles(e.target.files)
            e.target.value = ""
          }}
        />

        <div className="flex flex-col gap-4 p-4">{render[view]()}</div>
      </SidebarInset>

      {/* Thème imposé : le Toaster du registry le lit dans next-themes, sans
          provider ici. Son {...props} passe après, donc la prop l'emporte. */}
      <Toaster theme={dark ? "dark" : "light"} />
    </SidebarProvider>
  )
}
