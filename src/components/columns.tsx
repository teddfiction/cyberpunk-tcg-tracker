/**
 * Colonnes TanStack, une liste par mode d'affichage. Les `cell` rendent le
 * contenu ; le tri et le filtrage viennent de lib/table.ts. Les trois dernières
 * colonnes sont masquées : elles ne portent que les filtres de la barre.
 */
import type { ColumnDef } from "@tanstack/react-table"
import { ExternalLink } from "lucide-react"

import { CodeBadge } from "@/components/code-badge"
import { CARDMARKET_SEARCH, cyberpunkTcgUrl } from "@/data/expansions"
import { rarityLabel, rarityRank } from "@/data/rarities"
import { eur, pct } from "@/lib/format"
import { MODES, type Mode } from "@/lib/modes"
import { expansionsOf, filterExpansions, filterFlag, sortText } from "@/lib/table"
import { cn } from "@/lib/utils"
import type { AnyRow, TableRow } from "@/types"

const dash = <span className="text-muted-foreground/50">—</span>

/**
 * Colonne monétaire. L'accesseur renvoie `undefined` et non `null` : c'est ce
 * que lit `sortUndefined`, qui range les valeurs manquantes en bas quel que
 * soit le sens du tri.
 */
const money = (
  id: string,
  header: string,
  get: (r: AnyRow) => number | null | undefined
): ColumnDef<TableRow> => ({
  id,
  accessorFn: (r) => get(r as AnyRow) ?? undefined,
  header,
  sortUndefined: "last",
  meta: { align: "right", decimal: true },
  cell: ({ getValue }) => eur(getValue<number | undefined>()) ?? dash,
})

/** Colonne d'écart en pourcentage : négatif en destructive. */
const percent = (
  id: string,
  header: string,
  get: (r: AnyRow) => number | null | undefined
): ColumnDef<TableRow> => ({
  id,
  accessorFn: (r) => get(r as AnyRow) ?? undefined,
  header,
  sortUndefined: "last",
  meta: { align: "right", decimal: true },
  cell: ({ getValue }) => {
    const v = getValue<number | undefined>()
    return v == null ? dash : <span className={cn(v < 0 && "text-destructive")}>{pct(v)}</span>
  },
})

const nameColumn = (header: string): ColumnDef<TableRow> => ({
  id: "name",
  accessorKey: "name",
  header,
  sortingFn: sortText,
  meta: { className: "max-w-[300px] min-w-[180px]" },
  cell: ({ row }) => {
    const card = "nExp" in row.original
    const r = row.original as AnyRow
    return (
      <div className="flex items-center gap-2">
        {r.thumb && (
          <img
            src={r.thumb}
            alt=""
            loading="lazy"
            className="border-border h-10 w-7 shrink-0 border object-cover"
          />
        )}
        <div className="min-w-0">
          <a
            href={CARDMARKET_SEARCH + encodeURIComponent(r.name)}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 truncate font-medium hover:underline"
          >
            <span className="truncate">{r.name}</span>
            <ExternalLink className="text-muted-foreground size-3 shrink-0" />
          </a>
          <span className="text-muted-foreground block truncate text-xs">
            {card ? r.expName : r.cat}
            {r.foil && !card ? " · foil listé" : ""}
            {!card && r.variants > 1 ? (
              <span title="Cardmarket liste plusieurs produits sous ce nom dans cette extension, sans rien qui permette de les distinguer à part leur ID.">
                {` · ${r.variants} versions`}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    )
  },
})

const codeColumn: ColumnDef<TableRow> = {
  id: "code",
  accessorKey: "code",
  header: "Code",
  sortingFn: sortText,
  cell: ({ row, table }) => {
    const meta = table.options.meta
    return (
      <CodeBadge
        exp={(row.original as AnyRow).exp}
        codes={meta!.codes}
        expansions={meta!.expansions}
      />
    )
  },
}

/** N'apparaît qu'une fois l'enrichissement Netdeck chargé. */
const numColumn: ColumnDef<TableRow> = {
  id: "num",
  accessorFn: (r) => (r as AnyRow).num ?? undefined,
  header: "N°",
  sortingFn: sortText,
  sortUndefined: "last",
  meta: { className: "text-muted-foreground font-mono text-xs whitespace-nowrap" },
  cell: ({ row }) => {
    const r = row.original as AnyRow
    if (!r.num) return dash
    return r.slug ? (
      <a
        href={cyberpunkTcgUrl(r.slug, r.uuid)}
        target="_blank"
        rel="noopener"
        className="hover:text-foreground hover:underline"
      >
        #{r.num}
      </a>
    ) : (
      `#${r.num}`
    )
  },
}

/**
 * Rareté de la carte. En clair dès que les impressions connues s'accordent —
 * c'est le cas général, Netdeck publiant une rareté par carte. En pointillés,
 * listant les candidates, seulement si elles divergent.
 */
const rarityColumn: ColumnDef<TableRow> = {
  id: "rarity",
  // Le rang, pas le libellé : « Common » ne doit pas se ranger avant « Epic »
  // par ordre alphabétique. Une ligne ambiguë prend le rang de sa candidate la
  // plus commune, pour rester à sa place plutôt que d'être reléguée en bas.
  accessorFn: (r) => {
    const row = r as AnyRow
    if (row.rarity) return rarityRank(row.rarity)
    const ranks = (row.rarities ?? []).map(rarityRank)
    return ranks.length ? Math.min(...ranks) : undefined
  },
  header: "Rareté",
  sortUndefined: "last",
  meta: {
    className: "text-xs whitespace-nowrap",
    csv: (r) => r.rarity ?? (r.rarities ?? []).map(rarityLabel).join(" / "),
  },
  cell: ({ row }) => {
    const r = row.original as AnyRow
    if (r.rarity) return rarityLabel(r.rarity)
    const candidates = r.rarities ?? []
    if (!candidates.length) return dash
    return (
      <span
        className="text-muted-foreground underline decoration-dotted underline-offset-2"
        title="Les impressions connues de cette carte ne s'accordent pas sur une rareté."
      >
        {candidates.map(rarityLabel).join(" · ")}
      </span>
    )
  },
}

const expansionColumn: ColumnDef<TableRow> = {
  id: "expName",
  accessorKey: "expName",
  header: "Extension",
  sortingFn: sortText,
  meta: { className: "text-muted-foreground max-w-[200px] truncate text-sm" },
  cell: ({ getValue }) => getValue<string>(),
}

const idColumn: ColumnDef<TableRow> = {
  id: "id",
  accessorKey: "id",
  header: "ID",
  meta: { align: "right", className: "text-muted-foreground text-xs" },
  cell: ({ getValue }) => getValue<number>(),
}

const printsColumn: ColumnDef<TableRow> = {
  id: "nExp",
  accessorKey: "nExp",
  header: "Impressions",
  meta: {
    csv: (r, codes) => r.prints.map((p) => codes[String(p.exp)]?.code || `#${p.exp}`).join(" "),
  },
  cell: ({ row, table }) => {
    const meta = table.options.meta
    return (
      <div className="flex flex-wrap gap-1">
        {(row.original as AnyRow).prints.map((p) => (
          <CodeBadge key={p.exp} exp={p.exp} codes={meta!.codes} expansions={meta!.expansions} />
        ))}
      </div>
    )
  },
}

/** Portent les filtres de la barre. Masquées, donc jamais rendues ni exportées. */
const filterColumns = (mode: Mode): ColumnDef<TableRow>[] => [
  {
    id: "exps",
    accessorFn: (r) => expansionsOf(r),
    filterFn: filterExpansions,
    enableSorting: false,
    enableGlobalFilter: false,
  },
  {
    id: "priced",
    accessorFn: (r) => MODES[mode].priced(r),
    filterFn: filterFlag,
    enableSorting: false,
    enableGlobalFilter: false,
  },
  {
    id: "single",
    accessorKey: "single",
    filterFn: filterFlag,
    enableSorting: false,
    enableGlobalFilter: false,
  },
]

/**
 * Colonnes visibles par mode. `Record<Mode, …>` : ajouter un mode au registre
 * sans ajouter sa liste ici ne compile pas.
 *
 * `avg1`, `avg7`, `avg30` et leurs équivalents foil n'y figurent pas :
 * Cardmarket les publie systématiquement vides, `trend-foil` vaut 0 partout.
 */
const VISIBLE: Record<Mode, (enriched: boolean) => ColumnDef<TableRow>[]> = {
  normal: (enriched) => [
    nameColumn("Produit"),
    codeColumn,
    ...(enriched ? [numColumn, rarityColumn] : []),
    expansionColumn,
    money("avg", "Moyenne", (r) => r.avg),
    money("low", "Mini", (r) => r.low),
    money("trend", "Tendance", (r) => r.trend),
    percent("d", "Δ tend./mini", (r) => r.d),
    idColumn,
  ],
  foil: (enriched) => [
    nameColumn("Produit"),
    codeColumn,
    ...(enriched ? [numColumn, rarityColumn] : []),
    expansionColumn,
    money("avgF", "Moyenne foil", (r) => r.avgF),
    money("lowF", "Mini foil", (r) => r.lowF),
    percent("df", "Δ moy./mini", (r) => r.df),
    idColumn,
  ],
  card: () => [
    nameColumn("Carte"),
    printsColumn,
    money("bestLow", "Mini le moins cher", (r) => r.bestLow),
    money("bestTrend", "Tendance mini", (r) => r.bestTrend),
    money("bestLowF", "Mini foil", (r) => r.bestLowF),
  ],
}

export function columnsFor(mode: Mode, enriched: boolean): ColumnDef<TableRow>[] {
  return [
    // La recherche plein texte n'est déclarée que sur la première colonne : sinon
    // TanStack rejouerait le même prédicat sur chaque colonne de chaque ligne.
    ...VISIBLE[mode](enriched).map((c, i) => ({ ...c, enableGlobalFilter: i === 0 })),
    ...filterColumns(mode),
  ]
}
