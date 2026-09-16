/**
 * Versions d'une carte, en modale : le visuel de la version choisie en grand, les
 * miniatures des autres en guise de menu, et la quantité possédée de celle-ci.
 *
 * La modale existe parce qu'une tuile de grille ne laissait à chaque version
 * qu'une vignette de 40 px — or l'artwork est justement la seule chose qui
 * distingue deux impressions que Cardmarket confond. Le grand visuel est affiché
 * à 320 px CSS pour un fichier de 640 px : net sur Retina (voir « Limites des
 * données »). Les informations parlent la voix de la grille, `card-info.tsx`.
 */
import * as React from "react"
import { ExternalLink, Layers } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InfoBadge,
  InfoList,
  InfoRow,
  StatLine,
  TypeBadge,
  Unknown,
} from "@/components/card-info"
import { CollectionControl } from "@/components/collection-control"
import { cyberpunkTcgUrl } from "@/data/expansions"
import { rarityLabel } from "@/data/rarities"
import { qtyOf } from "@/lib/collection"
import { eur, plural } from "@/lib/format"
import { cardStats } from "@/lib/printings"
import { cn } from "@/lib/utils"
import type { Scope } from "@/lib/collection"
import type { Collection, GridCard, PrintRow } from "@/types"

type Props = {
  card: GridCard
  /** Version à ouvrir : celle que montrait la tuile cliquée. */
  pick: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tuile à re-focaliser en sortant. Voir `onCloseAutoFocus` plus bas. */
  trigger: React.RefObject<HTMLButtonElement | null>
  /** Dans la collection, la carte n'apporte que la version possédée. */
  scope: Scope
  /**
   * Quantités lues ici, pas dans `card` : la carte est un instantané pris au
   * clic sur la tuile, que la reconstruction de la grille ne met pas à jour.
   */
  collection: Collection
  onQty: (printing: PrintRow, qty: number) => void
}

export function CardDialog({
  card,
  pick,
  open,
  onOpenChange,
  trigger,
  scope,
  collection,
  onQty,
}: Props) {
  // Index dans `card.printings`, pas un uuid : changer de carte — ou de tuile
  // après un filtre de rareté — doit repartir de la version que la tuile
  // montrait, pas de celle qu'on avait choisie sur la carte précédente.
  const [picked, setPicked] = React.useState(pick)
  React.useEffect(() => setPicked(pick), [card.id, pick])

  const stats = cardStats(card)
  const n = card.printings.length
  const shown = card.printings[Math.min(picked, n - 1)]

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
        {/* `text-left` : le registry centre l'en-tête sur mobile, ce qui
            décalerait le titre des badges alignés à gauche en dessous. */}
        <DialogHeader className="text-left">
          <DialogTitle className="pr-6">{card.name}</DialogTitle>
          {/* Mêmes badges et même ligne de caractéristiques que la tuile. La
              quantité possédée n'y figure pas : elle se lit par version, dans
              `collection`, jamais dans cet instantané de la carte. */}
          <DialogDescription asChild>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1">
                <TypeBadge type={card.type} color={card.color} className="text-xs" />
                {/* Dans la collection la carte ne porte que sa version : compter
                    ses impressions y dirait « 1 », ce qui est faux pour la carte. */}
                {scope === "all" && (
                  <InfoBadge className="text-muted-foreground gap-1 text-xs">
                    <Layers className="size-3" />
                    {plural(n, "impression")}
                  </InfoBadge>
                )}
              </div>
              {stats.length > 0 && <StatLine stats={stats} color={card.color} className="text-xs" />}
            </div>
          </DialogDescription>

          {card.slug && (
            <a
              href={cyberpunkTcgUrl(card.slug)}
              target="_blank"
              rel="noopener"
              className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-xs hover:underline"
            >
              Fiche officielle
              <ExternalLink className="size-3" />
            </a>
          )}
        </DialogHeader>

        {!shown ? (
          <p className="text-muted-foreground text-sm">Aucune impression connue pour cette carte.</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row">
            <Artwork printing={shown} />

            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {n > 1 && (
                <Picker
                  printings={card.printings}
                  picked={picked}
                  onPick={setPicked}
                  collection={collection}
                />
              )}
              {/* `key` : changer de version abandonne une confirmation de
                  retrait en cours, plutôt que de la reporter sur l'autre. */}
              <CollectionControl
                key={shown.uuid}
                qty={qtyOf(collection, shown.uuid)}
                onChange={(qty) => onQty(shown, qty)}
              />
              <Details printing={shown} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Le visuel de la version choisie : 320 px CSS au plus, pour un fichier de 640 px. */
function Artwork({ printing: p }: { printing: PrintRow }) {
  if (!p.thumb) {
    return (
      <div className="border-border bg-muted aspect-[5/7] w-full max-w-[320px] shrink-0 border" />
    )
  }
  return (
    <img
      src={p.thumb}
      alt={`${p.name} — ${p.set}`}
      className="border-border w-full max-w-[320px] shrink-0 self-start border"
    />
  )
}

/**
 * Les versions, en miniatures. Cliquer remplace le grand visuel. Les versions
 * possédées portent leur quantité : c'est ce qui évite d'aller vérifier dans la
 * collection laquelle on a déjà.
 */
function Picker({
  printings,
  picked,
  onPick,
  collection,
}: {
  printings: PrintRow[]
  picked: number
  onPick: (index: number) => void
  collection: Collection
}) {
  return (
    <div role="listbox" aria-label="Versions de la carte" className="flex flex-wrap gap-2">
      {printings.map((p, i) => {
        const qty = qtyOf(collection, p.uuid)
        return (
          <button
            key={p.uuid}
            role="option"
            aria-selected={i === picked}
            onClick={() => onPick(i)}
            title={
              `${p.rarity ? rarityLabel(p.rarity) : "Rareté inconnue"} — ${p.set}` +
              (qty ? ` — ${qty} dans ma collection` : "")
            }
            className={cn(
              "focus-visible:ring-ring/50 relative w-14 shrink-0 cursor-pointer border outline-none focus-visible:ring-[3px]",
              i === picked ? "border-ring" : "border-border opacity-60 hover:opacity-100"
            )}
          >
            {p.thumb ? (
              <img src={p.thumb} alt="" className="block w-full" />
            ) : (
              <div className="bg-muted aspect-[5/7] w-full" />
            )}
            {qty > 0 && (
              <span className="bg-background text-foreground absolute right-0 bottom-0 px-1 font-mono text-[10px] leading-4 tabular-nums">
                ×{qty}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Ce que l'on sait de la version choisie, dans la voix de la grille. */
function Details({ printing: p }: { printing: PrintRow }) {
  return (
    <InfoList>
      <InfoRow label="Set">{p.set}</InfoRow>
      <InfoRow label="Rareté">{p.rarity ? rarityLabel(p.rarity) : <Unknown />}</InfoRow>
      <InfoRow label="Numéro">
        {/* Hors capitales : « 005a » n'est pas « 005A », et le « β » des
            tirages Beta passerait pour un B latin. */}
        {p.num ? <span className="normal-case">#{p.num}</span> : <Unknown />}
      </InfoRow>
      <InfoRow label="Illustration">{p.artist ?? <Unknown />}</InfoRow>
      <InfoRow label="Prix Cardmarket">
        {p.low != null ? (
          <span className="tabular-nums">{eur(p.low)}</span>
        ) : p.lowRange ? (
          <span
            className="text-muted-foreground tabular-nums underline decoration-dotted underline-offset-2"
            title={`${p.variants} produits Cardmarket partagent ce nom dans cette extension : la cote de cette impression n'est pas isolable.`}
          >
            {eur(p.lowRange[0])} – {eur(p.lowRange[1])}
          </span>
        ) : (
          <Unknown />
        )}
      </InfoRow>
    </InfoList>
  )
}
