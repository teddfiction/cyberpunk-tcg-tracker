/**
 * Base de cartes Netdeck et collection : la grille des cartes officielles,
 * filtrable, sur deux périmètres.
 *
 * La base montre ce que la table des cotes ne peut pas montrer — les cartes
 * qu'aucun vendeur ne propose, et les artworks de chaque variante. La collection
 * est la même vue réduite aux versions possédées, une tuile chacune : mêmes
 * filtres, même modale, même réglage de quantité — rien de nouveau à apprendre.
 *
 * Le filtrage et la recherche passent par TanStack, comme les tables : les
 * colonnes de `grid-columns.ts` ne rendent rien, elles portent les facettes.
 */
import * as React from "react"
import { Download, Library, RotateCcw, Search, TriangleAlert, Upload } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardGrid } from "@/components/card-grid"
import { CollectionStats } from "@/components/collection-stats"
import { FacetFilter } from "@/components/facet-filter"
import { GRID_COLUMNS } from "@/components/grid-columns"
import { SortMenu } from "@/components/sort-menu"
import { useTable } from "@/hooks/use-table"
import {
  OWNED_FACET,
  collectionStats,
  orphans,
  ownedGrid,
  summarize,
  type Scope,
} from "@/lib/collection"
import { download, toCsv } from "@/lib/csv"
import { FACETS, RARITY_FACET, facetOptions } from "@/lib/facets"
import { plural } from "@/lib/format"
import { buildGrid, buildPrintings, searchCard } from "@/lib/printings"
import { SORTS } from "@/lib/sorts"
import type { CodeMap, Collection, EnrichedCard, PrintRow, Row } from "@/types"

type Props = {
  scope: Scope
  cards: EnrichedCard[] | null
  rows: Row[]
  codes: CodeMap
  expansions: Record<string, string>
  collection: Collection
  onQty: (printing: PrintRow, qty: number) => void
  onImport: () => void
  /** Mène à la base de cartes, d'où l'on ajoute à la collection. */
  onBrowse: () => void
}

export function NetdeckView({
  scope,
  cards,
  rows,
  codes,
  expansions,
  collection,
  onQty,
  onImport,
  onBrowse,
}: Props) {
  const base = React.useMemo(() => {
    const printings = buildPrintings({ cards, rows, expansions, codes, collection })
    return buildGrid(cards, printings)
  }, [cards, rows, expansions, codes, collection])

  const owned = scope === "owned"
  const grid = React.useMemo(() => (owned ? ownedGrid(base) : base), [base, owned])

  const table = useTable({
    data: grid,
    columns: GRID_COLUMNS,
    defaultSort: SORTS.default.sorting,
    getRowId: (c) => c.id,
    globalFilterFn: searchCard,
    meta: { codes, expansions },
  })

  // Comptées sur toutes les tuiles du périmètre : cocher une option ne doit pas
  // faire disparaître les autres, sinon on ne peut plus élargir sa sélection.
  // La collection masque Possédée / Manquante, qui n'y aurait qu'une valeur.
  const options = React.useMemo(
    () =>
      FACETS.filter((facet) => !owned || facet.id !== OWNED_FACET).map((facet) => ({
        facet,
        options: facetOptions(facet, grid),
      })),
    [grid, owned]
  )

  const lost = React.useMemo(
    () => (owned && base.length ? orphans(collection, base) : []),
    [owned, base, collection]
  )

  if (!base.length) {
    return <EmptyState onImport={onImport} kept={owned ? summarize(collection) : null} />
  }

  const search = (table.getState().globalFilter as string) ?? ""
  const visible = table.getRowModel().rows.map((r) => r.original)
  // Les tuiles montrent l'illustration de la rareté demandée : c'est l'artwork
  // qui distingue deux versions, une grille filtrée qui garderait le visuel par
  // défaut ne montrerait pas ce qu'on vient de cocher.
  const rarities = (table.getColumn(RARITY_FACET)?.getFilterValue() as string[]) ?? []
  const filtering = table.getState().columnFilters.length > 0 || search.length > 0

  return (
    // Largeur plafonnée, contrairement à la table des cotes qui gagne à
    // s'étaler : à 1280 px, quatre colonnes font des tuiles de 308 px, soit
    // juste sous les 320 px CSS pour lesquels les visuels sont exportés (en
    // 640 px, pour Retina). Au-delà ils seraient agrandis, et l'original ne
    // fait que 733 px.
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      {owned && grid.length > 0 && <CollectionStats stats={collectionStats(base)} />}
      {lost.length > 0 && <Orphans entries={lost} />}

      {/* Une collection vide n'a rien à filtrer. La grille, elle, reste montée
          pour ne pas emporter la modale — voir `CardGrid`. */}
      {grid.length > 0 && (
        <>
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
              onClick={() =>
                download(
                  owned ? "cyberpunk-tcg-collection.csv" : "cyberpunk-tcg-cartes.csv",
                  toCsv(table, codes)
                )
              }
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
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs tabular-nums">
              {owned
                ? `${visible.length} / ${plural(grid.length, "version")} · ${plural(
                    visible.reduce((n, c) => n + c.owned, 0),
                    "exemplaire"
                  )}`
                : `${visible.length} / ${grid.length} cartes · ${visible.reduce(
                    (n, c) => n + c.printings.length,
                    0
                  )} impressions`}
            </span>

            <SortMenu
              sorting={table.getState().sorting}
              onSort={(next) => table.setSorting(next)}
            />
          </div>
        </>
      )}

      <CardGrid
        cards={visible}
        rarities={rarities}
        scope={scope}
        collection={collection}
        onQty={onQty}
        empty={grid.length ? undefined : <EmptyCollection onBrowse={onBrowse} />}
      />

      <p className="text-muted-foreground text-xs leading-relaxed">
        {owned ? (
          <>
            Une tuile par version possédée ; les quantités se règlent dans la modale, ici comme dans
            la base de cartes. La collection est conservée dans ce navigateur seulement : l'exporter
            depuis Paramètres pour la sauvegarder.
          </>
        ) : (
          <>
            Source : <code>api.netdeck.gg</code> via <code>npm run data:netdeck:images</code>.
            Cliquer une carte ouvre ses versions. La cote Cardmarket n'est rattachée que lorsqu'un
            seul produit correspond à cette carte dans cette extension ; sinon la fourchette est
            affichée en pointillés — rien ne dit lequel est cette impression précise.
          </>
        )}
      </p>
    </div>
  )
}

function EmptyState({
  onImport,
  kept,
}: {
  onImport: () => void
  /** Collection conservée en attendant la base, `null` hors collection. */
  kept: { versions: number } | null
}) {
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
        {kept && kept.versions > 0 && (
          <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
            La collection ({plural(kept.versions, "version")}) est conservée : elle réapparaîtra
            une fois la base importée.
          </p>
        )}
      </div>
      <Button size="sm" onClick={onImport}>
        <Upload />
        Importer un JSON
      </Button>
    </div>
  )
}

function EmptyCollection({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 border p-6">
      <div>
        <h2 className="text-sm font-medium">La collection est vide</h2>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm leading-relaxed">
          Ouvrir une carte dans la base de cartes, choisir la version possédée, puis « Ajouter à ma
          collection ».
        </p>
      </div>
      <Button size="sm" onClick={onBrowse}>
        <Library />
        Parcourir la base de cartes
      </Button>
    </div>
  )
}

/**
 * Versions possédées que la base importée ne connaît pas. Nommées par leur
 * instantané, et gardées : une base plus récente peut les retrouver.
 */
function Orphans({ entries }: { entries: { uuid: string; name: string; set: string; qty: number }[] }) {
  return (
    <Alert>
      <TriangleAlert />
      {/* Titre court : celui du registry tient sur une ligne. */}
      <AlertTitle>
        {entries.length > 1
          ? `${entries.length} versions introuvables dans la base`
          : "1 version introuvable dans la base"}
      </AlertTitle>
      <AlertDescription>
        <p>
          La base de cartes importée ne connaît pas ces versions de la collection. Elles restent
          conservées, sans tuile ; une base plus récente devrait les retrouver.
        </p>
        <ul className="list-inside list-disc">
          {entries.map((e) => (
            <li key={e.uuid}>
              {e.name}
              {e.set && ` — ${e.set}`} · ×{e.qty}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
