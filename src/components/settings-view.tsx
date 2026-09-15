/**
 * Vue Paramètres : saisie des codes d'impression, et gestion de ce que le
 * navigateur conserve d'une session à l'autre.
 */
import * as React from "react"
import { Copy, Trash2 } from "lucide-react"

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
import { dateFr } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CodeMap } from "@/types"

type Props = {
  codes: CodeMap
  setCodes: React.Dispatch<React.SetStateAction<CodeMap>>
  expansions: Record<string, string>
  counts: Record<string, number>
  onMessage: (message: string) => void
  /** Date du dernier import conservé, `null` si le navigateur n'en garde aucun. */
  storedAt: string | null
  onForget: () => void
}

/**
 * Les codes d'impression n'existent dans aucun export Cardmarket : ils sont
 * saisis à la main. Toute saisie vaut confirmation et fait passer le badge en
 * plein. La saisie est conservée dans ce navigateur, mais reporter le mapping
 * dans `src/data/expansions.ts` reste ce qui le rend permanent et partagé.
 */
export function SettingsView({
  codes,
  setCodes,
  expansions,
  counts,
  onMessage,
  storedAt,
  onForget,
}: Props) {
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
    <div className="flex flex-col gap-4">
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

      <StoredDataCard storedAt={storedAt} onForget={onForget} />
    </div>
  )
}

/**
 * Ce que le navigateur retient. Oublier est destructif mais réparable par un
 * nouvel import : une confirmation en deux temps suffit, sans boîte de dialogue.
 */
function StoredDataCard({ storedAt, onForget }: { storedAt: string | null; onForget: () => void }) {
  const [confirming, setConfirming] = React.useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Données conservées</CardTitle>
        <CardDescription>
          {storedAt
            ? `Le catalogue, les cotes, l'enrichissement Netdeck et les codes saisis sont conservés dans ce navigateur depuis le ${dateFr(storedAt)}. Recharger la page les retrouve.`
            : "Aucun import n'est conservé : l'app tourne sur le jeu de données embarqué."}{" "}
          Ce stockage est local à ce navigateur — il ne suit ni le dépôt, ni une autre machine.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button
          variant={confirming ? "destructive" : "outline"}
          size="sm"
          disabled={!storedAt}
          onClick={() => {
            if (!confirming) return setConfirming(true)
            setConfirming(false)
            onForget()
          }}
          onBlur={() => setConfirming(false)}
        >
          <Trash2 />
          {confirming ? "Confirmer l'oubli" : "Oublier les données conservées"}
        </Button>
      </CardContent>
    </Card>
  )
}
