import * as React from "react"
import { Download } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar, type View } from "@/components/app-sidebar"
import { DataTable } from "@/components/data-table"
import { FiltersBar } from "@/components/filters-bar"
import { SettingsView } from "@/components/settings-view"
import { StatsStrip } from "@/components/stats-strip"
import { useDataset } from "@/hooks/use-dataset"
import { useFilters } from "@/hooks/use-filters"
import { useTheme } from "@/hooks/use-theme"
import { download, toCsv } from "@/lib/csv"
import { selectRows } from "@/lib/dataset"
import { dateFr, dateShort } from "@/lib/format"

export default function App() {
  const data = useDataset()
  const { filters, patch, setMode, toggleSort, reset, columns } = useFilters(data.enriched)
  const { dark, toggle } = useTheme()

  const [view, setView] = React.useState<View>("table")
  const fileRef = React.useRef<HTMLInputElement>(null)

  const visible = React.useMemo(
    () => selectRows(data.rows, data.cards, filters),
    [data.rows, data.cards, filters]
  )

  const options = React.useMemo(
    () =>
      Object.entries(data.expCounts)
        .map(([exp, count]) => ({ exp, count }))
        .sort((a, b) => b.count - a.count),
    [data.expCounts]
  )

  const total = filters.mode === "card" ? data.cards.length : data.rows.length

  return (
    <SidebarProvider>
      <AppSidebar
        view={view}
        onView={setView}
        onImport={() => fileRef.current?.click()}
        dark={dark}
        onToggleTheme={toggle}
      />

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 !h-4" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-medium">
              {view === "table" ? "Data table" : "Paramètres"}
            </h1>
            <p className="text-muted-foreground truncate text-xs">
              {data.rows.length} produits · {data.cards.length} cartes · prix du{" "}
              {dateFr(data.pricesAt)} · catalogue du {dateShort(data.catalogAt)}
            </p>
          </div>
          {view === "table" && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() =>
                download(`cyberpunk-tcg-${filters.mode}.csv`, toCsv(columns, visible, data.codes))
              }
            >
              <Download />
              <span className="hidden sm:inline">Exporter en CSV</span>
            </Button>
          )}
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

        <div className="flex flex-col gap-4 p-4">
          {data.notice && (
            <Alert variant={data.notice.tone === "error" ? "destructive" : "default"}>
              <AlertTitle>
                {data.notice.tone === "error" ? "Import incomplet" : "Import réussi"}
              </AlertTitle>
              <AlertDescription>{data.notice.message}</AlertDescription>
            </Alert>
          )}

          {view === "settings" ? (
            <SettingsView
              codes={data.codes}
              setCodes={data.setCodes}
              expansions={data.expansions}
              counts={data.expCounts}
              onMessage={(message) => data.setNotice({ tone: "ok", message })}
            />
          ) : (
            <>
              <StatsStrip rows={data.rows} cards={data.cards} />

              <FiltersBar
                filters={filters}
                patch={patch}
                setMode={setMode}
                reset={reset}
                options={options}
                codes={data.codes}
                expansions={data.expansions}
                shown={visible.length}
                total={total}
              />

              <DataTable
                columns={columns}
                rows={visible}
                mode={filters.mode}
                sort={filters.sort}
                onSort={toggleSort}
                codes={data.codes}
                expansions={data.expansions}
              />

              <p className="text-muted-foreground text-xs leading-relaxed">
                Sources : exports publics Cardmarket joints sur <code>idProduct</code>, enrichis par
                l'API Netdeck via <code>npm run data:netdeck</code>. Les colonnes{" "}
                <code>avg1/avg7/avg30</code> et <code>trend-foil</code> sont vides ou constantes côté
                Cardmarket : elles ne sont pas affichées. <code>low</code> est la plus petite annonce,
                pas un prix de vente.
              </p>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
