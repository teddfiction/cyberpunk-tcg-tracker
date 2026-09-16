/**
 * Grille de cartes. Une tuile par carte ; cliquer l'ouvre en modale sur ses
 * impressions, dont chacune a son propre visuel — c'est là que se voient les
 * variantes de rareté que Cardmarket ne distingue pas. Dans la collection, une
 * tuile par version possédée.
 *
 * Filtrer par rareté change l'illustration des tuiles : c'est l'impression qui
 * porte cette rareté qui est montrée, et la modale s'ouvre sur elle.
 */
import * as React from "react"
import { Check, Layers } from "lucide-react"

import { CardDialog } from "@/components/card-dialog"
import { InfoBadge, StatLine, TypeBadge } from "@/components/card-info"
import { rarityLabel } from "@/data/rarities"
import { printingIndex, tileStats } from "@/lib/printings"
import { cn } from "@/lib/utils"
import type { Scope } from "@/lib/collection"
import type { Collection, GridCard, PrintRow } from "@/types"

type Props = {
  cards: GridCard[]
  /** Raretés cochées dans les filtres : la tuile montre alors cette version. */
  rarities: string[]
  scope: Scope
  collection: Collection
  onQty: (printing: PrintRow, qty: number) => void
  /** Ce qui remplace la grille quand elle est vide. Par défaut, un constat de filtres. */
  empty?: React.ReactNode
}

/**
 * Les miniatures sont des data URI : `loading="lazy"` ne s'y applique pas, le
 * navigateur décoderait les 151 visuels d'un coup. `content-visibility: auto`
 * lui rend le droit de sauter ce qui est hors écran ; `contain-intrinsic-size`
 * réserve la hauteur pour que la barre de défilement ne saute pas.
 */
const OFFSCREEN = "[content-visibility:auto] [contain-intrinsic-size:auto_520px]"

export function CardGrid({ cards, rarities, scope, collection, onQty, empty }: Props) {
  // La carte n'est pas remise à `null` à la fermeture : la modale la rend
  // encore pendant son animation de sortie. C'est `open` qui pilote, pas elle.
  const [card, setCard] = React.useState<GridCard | null>(null)
  const [open, setOpen] = React.useState(false)
  // Version sur laquelle ouvrir : celle que la tuile cliquée montrait, sans
  // quoi le grand visuel ne serait pas celui qu'on vient de cliquer.
  const [pick, setPick] = React.useState(0)
  const trigger = React.useRef<HTMLButtonElement | null>(null)

  const select = (c: GridCard, index: number, el: HTMLButtonElement) => {
    trigger.current = el
    setCard(c)
    setPick(index)
    setOpen(true)
  }

  return (
    <>
      {/* La grille vide ne démonte pas la modale : ajouter la dernière carte
          d'un filtre « Manquante », ou retirer la dernière version de la
          collection, fait disparaître sa tuile sous la modale encore ouverte. */}
      {!cards.length ? (
        (empty ?? (
          <div className="text-muted-foreground border p-8 text-center text-sm">
            Aucune carte ne correspond à ces filtres.
          </div>
        ))
      ) : (
        // Quatre colonnes au plus : au-delà, la tuile passe sous les 320 px CSS
        // pour lesquels le visuel est exporté, et celui-ci — le fond de cette
        // vue — devient illisible.
        // Espacement vertical doublé : les tuiles n'ont plus de bordure, c'est
        // le blanc qui les sépare.
        <div className="grid grid-cols-2 items-start gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => (
            <Tile
              key={c.id}
              card={c}
              rarities={rarities}
              scope={scope}
              onSelect={(index, el) => select(c, index, el)}
            />
          ))}
        </div>
      )}

      {card && (
        <CardDialog
          card={card}
          pick={pick}
          open={open}
          onOpenChange={setOpen}
          trigger={trigger}
          scope={scope}
          collection={collection}
          onQty={onQty}
        />
      )}
    </>
  )
}

function Tile({
  card,
  rarities,
  scope,
  onSelect,
}: {
  card: GridCard
  rarities: string[]
  scope: Scope
  onSelect: (index: number, trigger: HTMLButtonElement) => void
}) {
  const stats = tileStats(card)
  // L'impression mise en avant : celle de la rareté filtrée, à défaut la
  // version par défaut de la carte.
  const pick = printingIndex(card, rarities)
  const shown = card.printings[pick]

  return (
    <div className={cn("flex flex-col gap-2", OFFSCREEN)}>
      <button
        onClick={(e) => onSelect(pick, e.currentTarget)}
        aria-haspopup="dialog"
        aria-label={`${card.name} — ${scope === "owned" ? "voir la version" : "voir les versions"}`}
        className="focus-visible:ring-ring/50 block cursor-pointer outline-none focus-visible:ring-[3px]"
      >
        {/* Sans bordure : l'illustration se suffit, et le cadre dessiné sur la
            carte elle-même en tenait déjà lieu. */}
        {shown?.thumb ? (
          <img src={shown.thumb} alt={card.name} className="w-full" />
        ) : (
          <div className="bg-muted aspect-[5/7] w-full" />
        )}
      </button>

      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{card.name.split(" - ")[0]}</div>
        {card.subname && (
          <div className="text-muted-foreground truncate text-xs">{card.subname}</div>
        )}

        {/* Seule la couleur du type distingue les badges : voir `card-info.tsx`. */}
        <div className="mt-1 flex flex-wrap gap-1">
          <TypeBadge type={card.type} color={card.color} />
          {/* Dans la collection la tuile est une version : sa rareté la
              distingue d'une autre version de la même carte, que seul
              l'artwork séparerait sinon. */}
          {scope === "owned" && shown?.rarity && (
            <InfoBadge className="text-muted-foreground">{rarityLabel(shown.rarity)}</InfoBadge>
          )}
          {scope === "all" && card.printings.length > 1 && (
            <InfoBadge className="text-muted-foreground gap-1">
              <Layers className="size-3" />
              {card.printings.length}
            </InfoBadge>
          )}
          {/* Contour neutre et texte plein : le jaune de l'accent, en texte sur
              le thème clair, tomberait sous le contraste lisible. */}
          {card.owned > 0 && (
            <InfoBadge
              className="border-foreground/40 text-foreground gap-1"
              title={`${card.owned} dans ma collection`}
            >
              <Check className="size-3" />×{card.owned}
            </InfoBadge>
          )}
        </div>

        {stats.length > 0 && <StatLine stats={stats} color={card.color} className="mt-1.5" />}
      </div>
    </div>
  )
}
