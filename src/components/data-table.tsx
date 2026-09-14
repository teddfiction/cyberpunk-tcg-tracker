import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CodeBadge } from "@/components/code-badge"
import { CARDMARKET_SEARCH, cyberpunkTcgUrl } from "@/data/expansions"
import { isTextColumn } from "@/lib/columns"
import { eur, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CardRow, CodeMap, Col, Mode, Row, SortState } from "@/types"

type Props = {
  columns: Col[]
  rows: (Row | CardRow)[]
  mode: Mode
  sort: SortState
  onSort: (k: string, textual: boolean) => void
  codes: CodeMap
  expansions: Record<string, string>
}

export function DataTable({ columns, rows, mode, sort, onSort, codes, expansions }: Props) {
  return (
    <div className="overflow-x-auto border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => {
              const active = sort.k === c.k
              const textual = isTextColumn(c.t)
              return (
                <TableHead
                  key={c.k}
                  className={cn("p-0", !textual && "text-right")}
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                >
                  <button
                    onClick={() => onSort(c.k, textual)}
                    className={cn(
                      "hover:text-foreground flex w-full items-center gap-1 px-3 py-2 text-xs whitespace-nowrap",
                      active ? "text-foreground font-semibold" : "text-muted-foreground font-medium",
                      !textual && "justify-end"
                    )}
                  >
                    {c.l}
                    {active &&
                      (sort.dir === "asc" ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      ))}
                  </button>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-muted-foreground h-24 text-center">
                Aucun résultat.
              </TableCell>
            </TableRow>
          )}

          {rows.map((r) => (
            <TableRow key={mode === "card" ? `c${(r as CardRow).mc}` : r.id}>
              {columns.map((c) => (
                <Cell
                  key={c.k}
                  col={c}
                  row={r}
                  mode={mode}
                  codes={codes}
                  expansions={expansions}
                />
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function Cell({
  col,
  row,
  mode,
  codes,
  expansions,
}: {
  col: Col
  row: Row | CardRow
  mode: Mode
  codes: CodeMap
  expansions: Record<string, string>
}) {
  const r = row as Row & CardRow
  const value = (row as Record<string, unknown>)[col.k]
  const numeric = "text-right tabular-nums"

  switch (col.t) {
    case "name":
      return (
        <TableCell className="max-w-[300px] min-w-[180px]">
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
                {mode === "card" ? r.expName : r.cat}
                {r.rarity ? ` · ${r.rarity}` : ""}
                {r.foil && mode !== "card" ? " · foil listé" : ""}
              </span>
            </div>
          </div>
        </TableCell>
      )

    case "code":
      return (
        <TableCell>
          <CodeBadge exp={r.exp} codes={codes} expansions={expansions} />
        </TableCell>
      )

    case "num":
      return (
        <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          {r.num ? (
            r.slug ? (
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
          ) : (
            <span className="text-muted-foreground/50">—</span>
          )}
        </TableCell>
      )

    case "prints":
      return (
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {r.prints.map((p) => (
              <CodeBadge key={p.exp} exp={p.exp} codes={codes} expansions={expansions} />
            ))}
          </div>
        </TableCell>
      )

    case "exp":
      return (
        <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
          {r.expName}
        </TableCell>
      )

    case "id":
      return <TableCell className="text-muted-foreground text-right text-xs tabular-nums">{r.id}</TableCell>

    default:
      if (value == null)
        return <TableCell className="text-muted-foreground/50 text-right">—</TableCell>
      if (col.t === "int") return <TableCell className={numeric}>{String(value)}</TableCell>
      if (col.t === "pct")
        return (
          <TableCell className={cn(numeric, (value as number) < 0 && "text-destructive")}>
            {pct(value as number)}
          </TableCell>
        )
      return <TableCell className={numeric}>{eur(value as number)}</TableCell>
  }
}
