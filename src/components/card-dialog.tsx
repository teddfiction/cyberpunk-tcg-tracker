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
import { CARDMARKET_SEARCH, cyberpunkTcgUrl } from "@/data/expansions"
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
        // Plus large qu'une modale ordinaire : les versions y gagnent des
        // miniatures lisibles à côté du grand visuel.
        className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"
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
        </DialogHeader>

        {!shown ? (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">Aucune impression connue pour cette carte.</p>
            <Links card={card} printing={null} />
          </div>
        ) : (
          // Côte à côte à partir de `md` seulement : en deçà, la colonne laissée
          // à droite du visuel serrerait les miniatures des versions.
          <div className="flex flex-col gap-6 md:flex-row">
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
              <Details printing={shown} />
              {/* Sous les informations : on ajoute une version après l'avoir
                  identifiée — set, rareté, numéro.
                  `key` : changer de version abandonne une confirmation de
                  retrait en cours, plutôt que de la reporter sur l'autre. */}
              <CollectionControl
                key={shown.uuid}
                qty={qtyOf(collection, shown.uuid)}
                onChange={(qty) => onQty(shown, qty)}
              />
              {/* `mt-auto` : la colonne s'étire à la hauteur du visuel, les liens
                  se calent donc sur son bord bas. Sur mobile, empilés, ils
                  suivent simplement le reste. */}
              <Links card={card} printing={shown} className="mt-auto" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Le visuel de la version choisie : 320 px CSS au plus, pour un fichier de 640 px.
 * Sans bordure, comme la tuile : le cadre dessiné sur la carte en tient lieu.
 */
function Artwork({ printing: p }: { printing: PrintRow }) {
  if (!p.thumb) {
    return <div className="bg-muted aspect-[5/7] w-full max-w-[320px] shrink-0" />
  }
  return (
    <img
      src={p.thumb}
      alt={`${p.name} — ${p.set}`}
      className="w-full max-w-[320px] shrink-0 self-start"
    />
  )
}

/**
 * Les versions, en miniatures. Cliquer remplace le grand visuel. Les versions
 * possédées portent leur quantité : c'est ce qui évite d'aller vérifier dans la
 * collection laquelle on a déjà.
 *
 * Chacune porte son numéro de collecteur : c'est le seul texte qui distingue
 * deux versions d'une même rareté (« 005a », « 005b »), et il reste lisible quelle
 * que soit la version choisie. La quantité le suit, sous la miniature plutôt que
 * posée sur l'artwork dont elle masquait un coin — et collée au numéro, séparée
 * par « · » : calée à droite, elle se lisait comme celle de la version voisine.
 *
 * Grille en `auto-fill` plutôt qu'un nombre de colonnes : les miniatures gardent
 * leur largeur, que la carte ait deux versions ou sept, et que la modale soit
 * étroite ou non.
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
    <div
      role="listbox"
      aria-label="Versions de la carte"
      // `gap-3` : l'outline de sélection déborde de 4 px. À `gap-2`, il tombait à
      // mi-chemin de la miniature voisine, sans qu'on sache à laquelle il est.
      className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3"
    >
      {printings.map((p, i) => {
        const qty = qtyOf(collection, p.uuid)
        const selected = i === picked
        return (
          <button
            key={p.uuid}
            role="option"
            aria-selected={selected}
            onClick={() => onPick(i)}
            title={
              `${p.rarity ? rarityLabel(p.rarity) : "Rareté inconnue"} — ${p.set}` +
              (qty ? ` — ${qty} dans ma collection` : "")
            }
            className={cn(
              // `gap-2` et non `gap-1` : l'outline de sélection toucherait le numéro.
              "focus-visible:ring-ring/50 flex cursor-pointer flex-col gap-2 text-left outline-none focus-visible:ring-[3px]",
              !selected && "opacity-60 hover:opacity-100"
            )}
          >
            {/* Sélection en `outline` et non en bordure : l'outline ne prend
                pas de place. La bordure de 1 px reste, devenue transparente, et
                l'outline se pose 3 px au-delà — 4 px d'air autour du visuel,
                sans qu'aucune dimension change. Une bordure épaissie ou un
                padding feraient bouger toute la grille à chaque clic. */}
            <span
              className={cn(
                "block border",
                selected ? "outline-ring border-transparent outline outline-offset-3" : "border-border"
              )}
            >
              {p.thumb ? (
                <img src={p.thumb} alt="" className="block w-full" />
              ) : (
                <span className="bg-muted block aspect-[5/7] w-full" />
              )}
            </span>
            {/* Pas de capitales : « 005a » et « 005A » ne désignent pas la même
                chose, et le « β » des tirages Beta passerait pour un B latin.
                Le numéro se tronque, jamais la quantité. Le « · » ne risque pas
                de finir orphelin comme dans `StatLine` : la ligne ne passe
                jamais à la ligne. */}
            <span
              className={cn(
                "flex items-baseline gap-1 font-mono text-[10px] tabular-nums",
                selected ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              <span className="truncate">{p.num ? `#${p.num}` : "—"}</span>
              {qty > 0 && (
                <>
                  <span aria-hidden className="text-muted-foreground shrink-0">
                    ·
                  </span>
                  <span className="text-foreground shrink-0">×{qty}</span>
                </>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Liens sortants, en pied de colonne.
 *
 * La fiche officielle vise la version affichée, comme le N° de la table des
 * cotes. Cardmarket, lui, n'a pas de fiche à viser : ses exports ne donnent ni
 * URL ni slug, et plusieurs produits partagent souvent le nom d'une carte sans
 * que rien ne dise lequel est cette version. Le lien ouvre donc sa recherche
 * sur le nom — la même que la colonne Produit.
 */
function Links({
  card,
  printing,
  className,
}: {
  card: GridCard
  printing: PrintRow | null
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1", className)}>
      {card.slug && (
        <OutLink href={cyberpunkTcgUrl(card.slug, printing?.uuid)}>Fiche officielle</OutLink>
      )}
      <OutLink href={CARDMARKET_SEARCH + encodeURIComponent(card.name)}>Cardmarket</OutLink>
    </div>
  )
}

function OutLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-xs hover:underline"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  )
}

/** Ce que l'on sait de la version choisie, dans la voix de la grille. */
function Details({ printing: p }: { printing: PrintRow }) {
  return (
    <InfoList>
      <InfoRow label="Set">{p.set}</InfoRow>
      <InfoRow label="Rareté">{p.rarity ? rarityLabel(p.rarity) : <Unknown />}</InfoRow>
      <InfoRow label="Numéro">
        {/* Hors capitales, comme sous les miniatures : c'est un identifiant. */}
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
