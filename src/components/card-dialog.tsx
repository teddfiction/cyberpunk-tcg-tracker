/**
 * Versions d'une carte, en modale.
 *
 * Sous la tuile, il n'y avait la place que d'une vignette de 40 px : les
 * variantes d'artwork — la seule chose que Cardmarket ne distingue pas — y
 * étaient illisibles, et déplier repoussait toute la grille. La modale les
 * montre à taille lisible sans rien déplacer derrière elle.
 */
import * as React from "react"
import { ExternalLink } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CodeBadge } from "@/components/code-badge"
import { cyberpunkTcgUrl } from "@/data/expansions"
import { rarityLabel } from "@/data/rarities"
import { eur } from "@/lib/format"
import { cardStats } from "@/lib/printings"
import type { CodeMap, GridCard, PrintRow } from "@/types"

type Props = {
  card: GridCard
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tuile à re-focaliser en sortant. Voir `onCloseAutoFocus` plus bas. */
  trigger: React.RefObject<HTMLButtonElement | null>
  codes: CodeMap
  expansions: Record<string, string>
}

export function CardDialog({ card, open, onOpenChange, trigger, codes, expansions }: Props) {
  const stats = cardStats(card)
  const n = card.printings.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
        // Radix rend le focus à ce qui l'avait avant l'ouverture, mais ici il
        // retombe sur `body` — mesuré. Le clavier repartirait alors du haut du
        // document à chaque carte refermée, sur une grille de 151 tuiles : on
        // vise la tuile explicitement.
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          trigger.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle className="pr-6">{card.name}</DialogTitle>
          <DialogDescription>
            {n > 1 ? `${n} impressions` : "1 impression"}
            {stats.length > 0 && ` · ${stats.join(" · ")}`}
          </DialogDescription>
        </DialogHeader>

        {n === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucune impression connue pour cette carte.
          </p>
        ) : (
          <ul className="grid items-start gap-3 sm:grid-cols-2">
            {card.printings.map((p) => (
              <Version key={p.uuid} printing={p} codes={codes} expansions={expansions} />
            ))}
          </ul>
        )}

        {card.slug && (
          <DialogFooter className="sm:justify-start">
            <a
              href={cyberpunkTcgUrl(card.slug)}
              target="_blank"
              rel="noopener"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs hover:underline"
            >
              Fiche officielle
              <ExternalLink className="size-3" />
            </a>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Version({
  printing: p,
  codes,
  expansions,
}: {
  printing: PrintRow
  codes: CodeMap
  expansions: Record<string, string>
}) {
  return (
    <li className="flex items-start gap-3 border p-3">
      {p.thumb ? (
        <img
          src={p.thumb}
          alt={`${p.name} — ${p.set}`}
          className="border-border w-24 shrink-0 border"
        />
      ) : (
        <div className="border-border bg-muted aspect-[5/7] w-24 shrink-0 border" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-1 text-sm font-medium">
          {p.rarity ? rarityLabel(p.rarity) : "Rareté inconnue"}
          {p.num && <span className="text-muted-foreground font-mono text-xs">#{p.num}</span>}
        </div>

        <div className="text-muted-foreground text-xs">{p.set}</div>
        {p.artist && (
          <div className="text-muted-foreground truncate text-xs">Illustration : {p.artist}</div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {p.exp && <CodeBadge exp={p.exp} codes={codes} expansions={expansions} />}
          <span className="text-sm tabular-nums">
            {p.low != null ? (
              eur(p.low)
            ) : p.lowRange ? (
              <span
                className="text-muted-foreground underline decoration-dotted underline-offset-2"
                title={`${p.variants} produits Cardmarket partagent ce nom dans cette extension : la cote de cette impression n'est pas isolable.`}
              >
                {eur(p.lowRange[0])} – {eur(p.lowRange[1])}
              </span>
            ) : (
              <span className="text-muted-foreground/50">—</span>
            )}
          </span>
        </div>
      </div>
    </li>
  )
}
