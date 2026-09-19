/**
 * Base de cartes Netdeck et collection : la grille des cartes officielles,
 * filtrable, sur deux périmètres.
 *
 * La base montre ce que la table des cotes ne peut pas montrer — les cartes
 * qu'aucun vendeur ne propose, et les artworks de chaque variante. La collection
 * est la même vue mesurée à trois niveaux, en onglets : jeu de base, toutes les
 * raretés, chaque version. Chacun montre toutes ses tuiles, celles qui manquent
 * en retrait. Mêmes filtres, même modale, même réglage de quantité — rien de
 * nouveau à apprendre.
 *
 * Le filtrage et la recherche passent par TanStack, comme les tables : les
 * colonnes de `grid-columns.ts` ne rendent rien, elles portent les facettes.
 */
import * as React from "react"
import { Download, Library, RotateCcw, Search, TriangleAlert, Upload } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { CardGrid } from "@/components/card-grid"
import { CollectionStats } from "@/components/collection-stats"
import { FacetFilter } from "@/components/facet-filter"
import { GRID_COLUMNS } from "@/components/grid-columns"
import { LevelTabs } from "@/components/level-tabs"
import { OwnedFilter } from "@/components/owned-filter"
import { SortMenu } from "@/components/sort-menu"
import { useTable } from "@/hooks/use-table"
import {
  LEVELS,
  MISSING,
  OWNED,
  OWNED_FACET,
  levelStats,
  orphans,
  scopeGrid,
  summarize,
  type Level,
  type Scope,
} from "@/lib/collection"
import { download, toCsv } from "@/lib/csv"
import { FACETS, RARITY_FACET, gridFacets, gridRows } from "@/lib/facets"
import { plural } from "@/lib/format"
import { buildGrid, buildPrintings, searchCard } from "@/lib/printings"
import { SORTS } from "@/lib/sorts"
import type { CodeMap, Collection, EnrichedCard, PrintRow, Row } from "@/types"

type Props = {
  /**
   * Périmètre à l'ouverture : « all » pour la base, un niveau pour la
   * collection, que ses onglets font ensuite changer.
   */
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

  // Un état local, perdu en quittant la vue comme ses filtres : la collection
  // rouvre sur le jeu de base.
  const [shown, setShown] = React.useState(scope)
  const inCollection = shown !== "all"
  const grid = React.useMemo(() => scopeGrid(shown, base), [base, shown])
  // Sur toutes les tuiles du niveau, pas sur celles que les filtres laissent :
  // c'est la complétion du niveau qu'on lit.
  const stats = React.useMemo(() => levelStats(grid), [grid])

  const table = useTable({
    data: grid,
    // Cocher une rareté décline chaque carte en ses cartes à collectionner :
    // Secret et Iconic Secret, ou les deux V - Streetkid Rare, ne sont pas deux
    // visuels d'une tuile mais deux cartes à réunir.
    rowsOf: gridRows,
    columns: GRID_COLUMNS,
    defaultSort: SORTS.default.sorting,
    getRowId: (c) => c.id,
    globalFilterFn: searchCard,
    meta: { codes, expansions },
  })

  // Comptées sur toutes les tuiles du périmètre, déclinées comme la grille
  // (`gridFacets`) : cocher une option ne doit pas faire disparaître les
  // autres, sinon on ne peut plus élargir sa sélection.
  const columnFilters = table.getState().columnFilters
  const options = React.useMemo(
    () => gridFacets(FACETS, grid, columnFilters),
    [grid, columnFilters]
  )

  const lost = React.useMemo(
    () => (inCollection && base.length ? orphans(collection, base) : []),
    [inCollection, base, collection]
  )

  if (!base.length) {
    return <EmptyState onImport={onImport} kept={inCollection ? summarize(collection) : null} />
  }

  const search = (table.getState().globalFilter as string) ?? ""
  const visible = table.getRowModel().rows.map((r) => r.original)
  // Les tuiles montrent l'illustration de la rareté demandée : c'est l'artwork
  // qui distingue deux versions, une grille filtrée qui garderait le visuel par
  // défaut ne montrerait pas ce qu'on vient de cocher.
  const rarities = (table.getColumn(RARITY_FACET)?.getFilterValue() as string[]) ?? []
  // Possédée ou Manquante, que pose le sélecteur de la collection.
  const ownedColumn = table.getColumn(OWNED_FACET)
  const owned = (ownedColumn?.getFilterValue() as string[] | undefined)?.[0]
  const impressions = visible.reduce((n, c) => n + c.printings.length, 0)
  const filtering = columnFilters.length > 0 || search.length > 0

  // Ce qui remplace une grille vide quand le sélecteur qui l'a vidée dit pourquoi :
  // plus rien ne manque au niveau, ou rien n'y est encore possédé. Sinon, le
  // constat de filtres de `CardGrid`.
  const empty =
    shown === "all" ? undefined : owned === MISSING && stats.missing === 0 ? (
      <Complete level={shown} />
    ) : owned === OWNED && stats.owned === 0 ? (
      <EmptyCollection onBrowse={onBrowse} />
    ) : undefined

  // Recherche, filtres, grille : ce que chaque niveau de la collection montre.
  // La même instance TanStack sert les trois onglets, donc tri, filtres et
  // recherche suivent de l'un à l'autre — « les rouges qui me manquent au jeu
  // de base », puis « au Masterset », sans rien ressaisir.
  const content = (
    <>
      {/* Une grille vide n'a rien à filtrer — ce qui n'arrive plus qu'à une
          base sans carte de ce niveau. La grille, elle, reste montée pour ne
          pas emporter la modale — voir `CardGrid`. */}
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
              onClick={() => download(CSV_NAMES[shown], toCsv(table, codes))}
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
            {/* Possession et tri côte à côte, à gauche, sous les filtres : les
                deux disent comment la grille se présente, pas ce qu'elle
                contient. La possession, dans la collection seulement — la base
                ne mesure pas de complétion. */}
            <div className="flex flex-wrap items-center gap-2">
              {inCollection && (
                <OwnedFilter
                  value={owned}
                  onChange={(next) => ownedColumn?.setFilterValue(next ? [next] : undefined)}
                />
              )}
              <SortMenu
                sorting={table.getState().sorting}
                onSort={(next) => table.setSorting(next)}
              />
            </div>

            {/* À droite, et y reste passé à la ligne (`ml-auto`). */}
            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
              {/* Déclinée par rareté, la base compte ses cartes et ses tuiles à
                  part : Sasha en Secret et en Iconic Secret, c'est une carte
                  de la base et deux tuiles. */}
              {shown === "all"
                ? `${new Set(visible.map((c) => c.name)).size} / ${grid.length} cartes` +
                  (rarities.length ? ` · ${plural(visible.length, "tuile")}` : "") +
                  ` · ${impressions} impressions`
                : `${visible.length} / ${plural(grid.length, LEVELS[shown].unit)}`}
            </span>
          </div>
        </>
      )}

      <CardGrid
        cards={visible}
        rarities={rarities}
        scope={shown}
        collection={collection}
        onQty={onQty}
        empty={empty}
      />

      <p className="text-muted-foreground text-xs leading-relaxed">{FOOTNOTES[shown]}</p>
    </>
  )

  return (
    // Largeur plafonnée, contrairement à la table des cotes qui gagne à
    // s'étaler : à 1280 px, quatre colonnes font des tuiles de 308 px, soit
    // juste sous les 320 px CSS pour lesquels les visuels sont exportés (en
    // 640 px, pour Retina). Au-delà ils seraient agrandis, et l'original ne
    // fait que 733 px.
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      {/* Au-dessus des onglets : elles valent pour la collection entière. */}
      {lost.length > 0 && <Orphans entries={lost} />}

      {inCollection ? (
        <Tabs
          value={shown}
          onValueChange={(value) => setShown(value as Level)}
          className="gap-4"
        >
          <LevelTabs />
          {/* Un seul panneau, dont la valeur suit l'onglet : le contenu est le
              même pour les trois, seule la grille change. */}
          <TabsContent value={shown} className="flex flex-col gap-4">
            {/* Sous les onglets, parce qu'elles comptent le niveau choisi. */}
            <CollectionStats stats={stats} />
            {content}
          </TabsContent>
        </Tabs>
      ) : (
        content
      )}
    </div>
  )
}

/** Nom du fichier CSV, par périmètre. */
const CSV_NAMES: Record<Scope, string> = {
  all: "cyberpunk-tcg-cartes.csv",
  base: "cyberpunk-tcg-jeu-de-base.csv",
  full: "cyberpunk-tcg-toutes-raretes.csv",
  masterset: "cyberpunk-tcg-masterset.csv",
}

/** Ce que rappelle la note de chaque niveau de la collection. */
const KEPT = (
  <>
    Les manquantes ont le visuel en retrait ; les quantités se règlent dans la modale, ici comme
    dans la base de cartes. La collection est conservée dans ce navigateur seulement : l'exporter
    depuis Paramètres pour la sauvegarder.
  </>
)

/** Note en pied de vue, par périmètre : d'où viennent les tuiles, et ce qu'on en fait. */
const FOOTNOTES: Record<Scope, React.ReactNode> = {
  all: (
    <>
      Source : <code>api.netdeck.gg</code> via <code>npm run data:netdeck:images</code>. Cliquer
      une carte ouvre ses versions. Cocher une rareté décline chaque carte en une tuile par
      rareté cochée — et par illustration alternative, comme les deux V - Streetkid Rare —,
      réduite à ses versions. La cote Cardmarket n'est rattachée que lorsqu'un seul produit
      correspond à cette carte dans cette extension ; sinon la fourchette est affichée en
      pointillés — rien ne dit lequel est cette impression précise.
    </>
  ),
  base: (
    <>
      Une tuile par carte à collectionner du jeu de base, de Common à Secret — et par illustration
      alternative, comme les deux V - Streetkid Rare. N'importe laquelle de ses impressions la
      complète : #109 ou #β109. {KEPT}
    </>
  ),
  full: (
    <>
      Une tuile par carte à collectionner, toutes raretés confondues : le jeu de base, plus chaque
      Iconic et chaque Nova Rare. N'importe laquelle de ses impressions la complète. {KEPT}
    </>
  ),
  masterset: (
    <>
      Une tuile par version : chaque set, chaque tirage Retail et Beta, chaque réimpression. {KEPT}
    </>
  ),
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
        <h2 className="text-sm font-medium">Rien de possédé à ce niveau</h2>
        <p className="text-muted-foreground mt-1 max-w-prose text-sm leading-relaxed">
          Choisir « Toutes » ou « Manquantes » pour voir ce qui manque, ou parcourir la base de
          cartes. Ouvrir une carte, puis « Ajouter à ma collection ».
        </p>
      </div>
      <Button size="sm" onClick={onBrowse}>
        <Library />
        Parcourir la base de cartes
      </Button>
    </div>
  )
}

/** « Manquantes » choisi, et il n'en reste aucune : le niveau est complet. */
function Complete({ level }: { level: Level }) {
  return (
    <div className="text-muted-foreground border p-8 text-center text-sm">
      Aucune carte ne manque : le niveau « {LEVELS[level].label} » est complet.
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
