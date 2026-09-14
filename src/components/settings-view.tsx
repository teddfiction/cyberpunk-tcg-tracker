/** Vue Paramètres : saisie des codes d'impression et export du mapping. */
import { Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { CodeMap } from "@/types"

type Props = {
  codes: CodeMap
  setCodes: React.Dispatch<React.SetStateAction<CodeMap>>
  expansions: Record<string, string>
  counts: Record<string, number>
  onMessage: (message: string) => void
}

/**
 * Les codes d'impression n'existent dans aucun export Cardmarket : ils sont
 * saisis à la main. Toute saisie vaut confirmation et fait passer le badge en
 * plein. Les modifications ne sont pas persistées — reporter le mapping dans
 * `src/data/expansions.ts` pour le figer.
 */
export function SettingsView({ codes, setCodes, expansions, counts, onMessage }: Props) {
  const list = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
  const confirmed = list.filter((e) => codes[e]?.sure).length

  function copyMapping() {
    const out: Record<string, { code: string; name: string }> = {}
    for (const e of list) {
      if (codes[e]?.code) out[e] = { code: codes[e].code, name: expansions[e] ?? `Extension ${e}` }
    }
    const text = JSON.stringify(out, null, 2)
    navigator.clipboard?.writeText(text).then(
      () => onMessage("Mapping des codes copié dans le presse-papier."),
      () => onMessage(text)
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Codes d'impression</CardTitle>
        <CardDescription>
          Ces codes ne figurent dans aucun export Cardmarket. {confirmed} confirmés sur {list.length}{" "}
          extensions — les champs en pointillés sont des déductions. Une saisie vaut confirmation.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((exp) => {
            const entry = codes[exp] ?? { code: "", sure: false }
            return (
              <div key={exp} className="flex items-center gap-2">
                <Input
                  value={entry.code}
                  placeholder="—"
                  spellCheck={false}
                  aria-label={`Code pour ${expansions[exp] ?? exp}`}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase()
                    setCodes((c) => ({ ...c, [exp]: { code, sure: code.length > 0 } }))
                  }}
                  className={cn(
                    "w-28 shrink-0 font-mono text-xs tabular-nums",
                    !entry.sure && "border-dashed"
                  )}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm">{expansions[exp] ?? `Extension ${exp}`}</div>
                  <div className="text-muted-foreground text-xs tabular-nums">
                    {counts[exp]} produits
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={copyMapping}>
            <Copy />
            Copier le mapping JSON
          </Button>
          <p className="text-muted-foreground text-xs">
            Reporte le résultat dans <code>src/data/expansions.ts</code> pour le rendre permanent.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
