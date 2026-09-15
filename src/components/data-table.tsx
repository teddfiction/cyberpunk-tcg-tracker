/**
 * Rendu de la table à partir de l'instance TanStack : en-têtes triables et
 * cellules. Aucune logique de tri ni de filtrage ici.
 */
import { flexRender, type Table as TanstackTable } from "@tanstack/react-table"
import { ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { TableRow as Line } from "@/types"

export function DataTable({ table }: { table: TanstackTable<Line> }) {
  const rows = table.getRowModel().rows

  return (
    <div className="overflow-x-auto border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const right = header.column.columnDef.meta?.align === "right"
                const sorted = header.column.getIsSorted()
                const label = flexRender(header.column.columnDef.header, header.getContext())
                return (
                  <TableHead
                    key={header.id}
                    className={cn("p-0", right && "text-right")}
                    aria-sort={
                      sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined
                    }
                  >
                    {header.column.getCanSort() ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "h-auto w-full justify-start gap-1 px-3 py-2 text-xs whitespace-nowrap",
                          sorted ? "text-foreground font-semibold" : "text-muted-foreground",
                          right && "justify-end"
                        )}
                      >
                        {label}
                        {sorted === "asc" && <ChevronUp className="size-3" />}
                        {sorted === "desc" && <ChevronDown className="size-3" />}
                      </Button>
                    ) : (
                      // Sans tri, un bouton serait un leurre : rien ne s'y passe.
                      <div className="text-muted-foreground px-3 py-2 text-xs whitespace-nowrap">
                        {label}
                      </div>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={table.getVisibleLeafColumns().length}
                className="text-muted-foreground h-24 text-center"
              >
                Aucun résultat.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const { align, className } = cell.column.columnDef.meta ?? {}
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(align === "right" && "text-right tabular-nums", className)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
