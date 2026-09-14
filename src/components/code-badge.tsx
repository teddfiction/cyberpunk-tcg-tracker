/** Badge du code d'impression d'une extension. Plein = confirmé, pointillés = déduit. */
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CodeMap } from "@/types"

type Props = {
  exp: number | string
  codes: CodeMap
  expansions: Record<string, string>
}

/**
 * Code d'impression d'une extension. Plein = confirmé, pointillés = déduit.
 * La distinction est portée par la variante Badge, pas par une couleur seule.
 */
export function CodeBadge({ exp, codes, expansions }: Props) {
  const entry = codes[String(exp)]
  const label = entry?.code || `#${exp}`
  const title =
    (expansions[String(exp)] ?? `Extension ${exp}`) +
    (entry?.code && !entry.sure ? " — code à confirmer" : "")

  return (
    <Badge
      variant={entry?.code && entry.sure ? "default" : "outline"}
      title={title}
      className={cn(
        "font-mono text-[11px] tabular-nums",
        entry?.code && !entry.sure && "border-dashed text-muted-foreground"
      )}
    >
      {label}
    </Badge>
  )
}
