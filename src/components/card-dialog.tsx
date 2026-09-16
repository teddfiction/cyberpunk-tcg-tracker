/**
 * Versions d'une carte, en modale : le visuel de la version choisie en grand, et
 * les miniatures des autres en guise de menu.
 *
 * La modale existe parce qu'une tuile de grille ne laissait à chaque version
 * qu'une vignette de 40 px — or l'artwork est justement la seule chose qui
 * distingue deux impressions que Cardmarket confond. Le grand visuel est plafonné
 * à 320 px : c'est la largeur native des miniatures, et il n'existe pas d'image
 * plus grande à aller chercher (voir « Limites des données »).
 */
import * as React from "react"
import { ExternalLink } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cyberpunkTcgUrl } from "@/data/expansions"
import { rarityLabel } from "@/data/rarities"
import { eur } from "@/lib/format"
import { cardStats, statText } from "@/lib/printings"
import { cn } from "@/lib/utils"
import type { GridCard, PrintRow } from "@/types"

type Props = {
  card: GridCard
  /** Version à ouvrir : celle que montrait la tuile cliquée. */
  pick: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tuile à re-focaliser en sortant. Voir `onCloseAutoFocus` plus bas. */
  trigger: React.RefObject<HTMLButtonElement | null>
}

export function CardDialog({ card, pick, open, onOpenChange, trigger }: Props) {
  // Index dans `card.printings`, pas un uuid : changer de carte — ou de tuile
  // après un filtre de rareté — doit repartir de la version que la tuile
  // montrait, pas de celle qu'on avait choisie sur la carte précédente.
  const [picked, setPicked] = React.useState(pick)
  React.useEffect(() => setPicked(pick), [card.name, pick])

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
        <DialogHeader>
          <DialogTitle className="pr-6">{card.name}</DialogTitle>
          <DialogDescription>
            {n > 1 ? `${n} impressions` : "1 impression"}
            {stats.length > 0 && ` · ${stats.map(statText).join(" · ")}`}
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
                <Picker printings={card.printings} picked={picked} onPick={setPicked} />
              )}
              <Details printing={shown} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Le visuel de la version choisie, à sa taille native au plus. */
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

/** Les versions, en miniatures. Cliquer remplace le grand visuel. */
function Picker({
  printings,
  picked,
  onPick,
}: {
  printings: PrintRow[]
  picked: number
  onPick: (index: number) => void
}) {
  return (
    <div role="listbox" aria-label="Versions de la carte" className="flex flex-wrap gap-2">
      {printings.map((p, i) => (
        <button
          key={p.uuid}
          role="option"
          aria-selected={i === picked}
          onClick={() => onPick(i)}
          title={`${p.rarity ? rarityLabel(p.rarity) : "Rareté inconnue"} — ${p.set}`}
          className={cn(
            "focus-visible:ring-ring/50 w-14 shrink-0 cursor-pointer border outline-none focus-visible:ring-[3px]",
            i === picked ? "border-ring" : "border-border opacity-60 hover:opacity-100"
          )}
        >
          {p.thumb ? (
            <img src={p.thumb} alt="" className="block w-full" />
          ) : (
            <div className="bg-muted aspect-[5/7] w-full" />
          )}
        </button>
      ))}
    </div>
  )
}

/** Ce que l'on sait de la version choisie. */
function Details({ printing: p }: { printing: PrintRow }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      <Row label="Set">{p.set}</Row>
      <Row label="Rareté">
        {p.rarity ? rarityLabel(p.rarity) : <Unknown />}
      </Row>
      <Row label="Numéro">
        {p.num ? <span className="font-mono">{p.num}</span> : <Unknown />}
      </Row>
      <Row label="Illustration">{p.artist ?? <Unknown />}</Row>
      <Row label="Prix Cardmarket">
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
      </Row>
    </dl>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  )
}

const Unknown = () => <span className="text-muted-foreground/50">—</span>
