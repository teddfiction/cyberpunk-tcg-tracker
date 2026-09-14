/**
 * Export CSV des lignes affichées, dans l'ordre affiché.
 * Point-virgule, virgule décimale et BOM : Excel FR ouvre le fichier sans
 * assistant d'import.
 */
import type { Table } from "@tanstack/react-table"

import type { AnyRow, CodeMap, TableRow } from "@/types"

const quote = (s: string) => `"${s.replace(/"/g, '""')}"`

export function toCsv(table: Table<TableRow>, codes: CodeMap): string {
  const columns = table.getVisibleLeafColumns()
  const lines = [columns.map((c) => quote(String(c.columnDef.header))).join(";")]

  for (const row of table.getRowModel().rows) {
    lines.push(
      columns
        .map((c) => {
          const meta = c.columnDef.meta
          if (meta?.csv) return quote(meta.csv(row.original as AnyRow, codes))
          const v = row.getValue(c.id)
          if (v == null) return ""
          if (typeof v === "number")
            return meta?.decimal ? v.toFixed(2).replace(".", ",") : String(v)
          return quote(String(v))
        })
        .join(";")
    )
  }
  return lines.join("\n")
}

export function download(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  // BOM : sans lui, Excel casse les accents.
  const blob = new Blob(["﻿" + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement("a"), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
