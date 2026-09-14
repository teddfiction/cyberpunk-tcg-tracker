import type { CardRow, CodeMap, Col, Row } from "@/types"

const quote = (s: string) => `"${s.replace(/"/g, '""')}"`

/** Point-virgule et virgule décimale : Excel FR ouvre le fichier sans assistant d'import. */
export function toCsv(cols: Col[], rows: (Row | CardRow)[], codes: CodeMap): string {
  const lines = [cols.map((c) => c.l).join(";")]

  for (const r of rows) {
    const any = r as Row & CardRow
    lines.push(
      cols
        .map((c) => {
          if (c.t === "name") return quote(r.name)
          if (c.t === "exp") return quote(r.expName)
          if (c.t === "code") return r.code ?? ""
          if (c.t === "num") return any.num ?? ""
          if (c.t === "prints")
            return quote(any.prints.map((p) => codes[String(p.exp)]?.code || `#${p.exp}`).join(" "))
          const v = (r as Record<string, unknown>)[c.k]
          if (v == null) return ""
          if (typeof v === "number" && c.t !== "id" && c.t !== "int")
            return v.toFixed(2).replace(".", ",")
          return String(v)
        })
        .join(";")
    )
  }
  return lines.join("\n")
}

export function download(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  // BOM : sans lui, Excel casse les accents.
  const blob = new Blob(["\ufeff" + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement("a"), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
