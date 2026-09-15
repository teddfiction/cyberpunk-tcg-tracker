/**
 * Grille de cartes. Une tuile par carte ; cliquer la déplie sur ses
 * impressions, dont chacune a son propre visuel — c'est là que se voient les
 * variantes de rareté que Cardmarket ne distingue pas.
 */
import * as React from "react"
import { ChevronDown, ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { CodeBadge } from "@/components/code-badge"
import { cyberpunkTcgUrl } from "@/data/expansions"
import { rarityLabel } from "@/data/rarities"
import { eur } from "@/lib/format"
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
const OFFSCREEN = "[content-visibility:auto] [contain-intrinsic-size:auto_360px]"

export function CardGrid({ cards, codes, expansions }: Props) {
  const [open, setOpen] = React.useState<Set<string>>(new Set())

  const toggle = (name: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  if (!cards.length) {
    return (
      <div className="text-muted-foreground border p-8 text-center text-sm">
        Aucune carte ne correspond à ces filtres.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {cards.map((card) => (
        <Tile
          key={card.name}
          card={card}
          expanded={open.has(card.name)}
          onToggle={() => toggle(card.name)}
          codes={codes}
          expansions={expansions}
        />
      ))}
    </div>
  )
}

function Tile({
  card,
  expanded,
  onToggle,
  codes,
  expansions,
}: {
  card: GridCard
  expanded: boolean
  onToggle: () => void
  codes: CodeMap
  expansions: Record<string, string>
}) {
  const stats = [
    card.cost != null && `Coût ${card.cost}`,
    card.power != null && `Force ${card.power}`,
    card.ram != null && `RAM ${card.ram}`,
    card.eddiable && "€$",
  ].filter(Boolean) as string[]

  return (
    <div className={cn("flex flex-col gap-2", !expanded && OFFSCREEN)}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="focus-visible:ring-ring/50 relative block outline-none focus-visible:ring-[3px]"
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
            {card.printings.length}
            <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
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

      {expanded && (
        <ul className="flex flex-col gap-2 border-t pt-2">
          {card.printings.map((p) => (
            <li key={p.uuid} className="flex items-start gap-2">
              {p.thumb && (
                <img
                  src={p.thumb}
                  alt={`${p.name} — ${p.set}`}
                  className="border-border h-14 w-10 shrink-0 border object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs font-medium">
                  {p.rarity ? rarityLabel(p.rarity) : "Rareté inconnue"}
                  {p.num && (
                    <span className="text-muted-foreground font-mono">#{p.num}</span>
                  )}
                </div>
                <div className="text-muted-foreground truncate text-xs">{p.set}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {p.exp && <CodeBadge exp={p.exp} codes={codes} expansions={expansions} />}
                  <span className="text-xs tabular-nums">
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
          ))}

          {card.slug && (
            <li>
              <a
                href={cyberpunkTcgUrl(card.slug)}
                target="_blank"
                rel="noopener"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs hover:underline"
              >
                Fiche officielle
                <ExternalLink className="size-3" />
              </a>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
