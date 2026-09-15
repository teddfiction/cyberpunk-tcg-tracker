/**
 * Grille de cartes. Une tuile par carte ; cliquer l'ouvre en modale sur ses
 * impressions, dont chacune a son propre visuel — c'est là que se voient les
 * variantes de rareté que Cardmarket ne distingue pas.
 */
import * as React from "react"
import { Layers } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { CardDialog } from "@/components/card-dialog"
import { eur } from "@/lib/format"
import { cardStats } from "@/lib/printings"
import { cn } from "@/lib/utils"
import type { CodeMap, GridCard } from "@/types"

type Props = {
  cards: GridCard[]
  codes: CodeMap
  expansions: Record<string, string>
}

/**
 * Les miniatures sont des data URI : `loading="lazy"` ne s'y applique pas, le
 * navigateur décoderait les 151 visuels d'un coup. `content-visibility: auto`
 * lui rend le droit de sauter ce qui est hors écran ; `contain-intrinsic-size`
 * réserve la hauteur pour que la barre de défilement ne saute pas.
 */
const OFFSCREEN = "[content-visibility:auto] [contain-intrinsic-size:auto_520px]"

export function CardGrid({ cards, codes, expansions }: Props) {
  // La carte n'est pas remise à `null` à la fermeture : la modale la rend
  // encore pendant son animation de sortie. C'est `open` qui pilote, pas elle.
  const [card, setCard] = React.useState<GridCard | null>(null)
  const [open, setOpen] = React.useState(false)
  const trigger = React.useRef<HTMLButtonElement | null>(null)

  const select = (c: GridCard, el: HTMLButtonElement) => {
    trigger.current = el
    setCard(c)
    setOpen(true)
  }

  if (!cards.length) {
    return (
      <div className="text-muted-foreground border p-8 text-center text-sm">
        Aucune carte ne correspond à ces filtres.
      </div>
    )
  }

  return (
    <>
      {/* Quatre colonnes au plus : au-delà, la tuile passe sous les 320 px de
          la miniature et le visuel — le fond de cette vue — devient illisible. */}
      <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Tile key={c.name} card={c} onSelect={(el) => select(c, el)} />
        ))}
      </div>

      {card && (
        <CardDialog
          card={card}
          open={open}
          onOpenChange={setOpen}
          trigger={trigger}
          codes={codes}
          expansions={expansions}
        />
      )}
    </>
  )
}

function Tile({
  card,
  onSelect,
}: {
  card: GridCard
  onSelect: (trigger: HTMLButtonElement) => void
}) {
  const stats = cardStats(card)

  return (
    <div className={cn("flex flex-col gap-2", OFFSCREEN)}>
      <button
        onClick={(e) => onSelect(e.currentTarget)}
        aria-haspopup="dialog"
        aria-label={`${card.name} — voir les versions`}
        className="focus-visible:ring-ring/50 relative block cursor-pointer outline-none focus-visible:ring-[3px]"
      >
        {card.thumb ? (
          <img src={card.thumb} alt={card.name} className="border-border w-full border" />
        ) : (
          <div className="border-border bg-muted aspect-[5/7] w-full border" />
        )}

        {card.printings.length > 1 && (
          <Badge
            variant="secondary"
            className="absolute top-1 right-1 gap-1 tabular-nums shadow-sm"
          >
            <Layers className="size-3" />
            {card.printings.length}
          </Badge>
        )}
      </button>

      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{card.name.split(" - ")[0]}</div>
        {card.subname && (
          <div className="text-muted-foreground truncate text-xs">{card.subname}</div>
        )}

        <div className="mt-1 flex flex-wrap gap-1">
          {card.color && <Badge variant="outline">{card.color}</Badge>}
          {card.type && <Badge variant="secondary">{card.type}</Badge>}
        </div>

        {stats.length > 0 && (
          <div className="text-muted-foreground mt-1 text-xs tabular-nums">
            {stats.join(" · ")}
          </div>
        )}

        {card.low != null && (
          <div className="mt-1 text-xs font-medium tabular-nums">dès {eur(card.low)}</div>
        )}
      </div>
    </div>
  )
}
