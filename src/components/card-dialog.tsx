/**
 * Versions d'une carte, en modale : le visuel de la version choisie en grand, les
 * miniatures des autres en guise de menu, et la quantité possédée de celle-ci.
 *
 * La modale existe parce qu'une tuile de grille ne laissait à chaque version
 * qu'une vignette de 40 px — or l'artwork est justement la seule chose qui
 * distingue deux impressions que Cardmarket confond. Le grand visuel est affiché
 * à 320 px CSS pour un fichier de 640 px : net sur Retina (voir « Limites des
 * données »). Les informations parlent la voix de la grille, `card-info.tsx`.
 *
 * On y passe d'une carte à l'autre, dans l'ordre de la grille, par l'en-tête ou
 * les flèches du clavier : constituer sa collection ne demande pas de refermer.
 */
import * as React from "react"
import { ChevronLeft, ChevronRight, ExternalLink, Layers } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  CollectibleBadges,
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
import type { Collectible } from "@/lib/printings"
import type { Collection, GridCard, PrintRow } from "@/types"

type Props = {
  card: GridCard
  /** Version à ouvrir : celle que montre la tuile de la carte. */
  pick: number
  /**
   * Carte à collectionner que représente la tuile, quand elle n'en représente
   * qu'une (`tileCollectible`) : la modale ne présente alors que ses versions.
   */
  collectible: Collectible | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Rang de la carte dans la séquence parcourue, à partir de 0. */
  at: number
  /** Longueur de la séquence parcourue. */
  count: number
  /** Passe à la carte voisine ; sans effet en bout de séquence. */
  onStep: (delta: -1 | 1) => void
  /** Rend le focus à la grille en sortant. Voir `onCloseAutoFocus` plus bas. */
  returnFocus: () => void
  /** Au Masterset, la carte n'apporte qu'une version. */
  scope: Scope
  /**
   * Quantités lues ici, pas dans `card` : la carte est un instantané pris au
   * clic sur la tuile, que la reconstruction de la grille ne met pas à jour.
   */
  collection: Collection
  onQty: (printing: PrintRow, qty: number) => void
}

/**
 * Flèches gauche et droite : carte précédente, suivante — la convention des
 * visionneuses. Les versions, elles, se choisissent au clic ou à la tabulation.
 */
const STEP_KEYS: Record<string, -1 | 1> = { ArrowLeft: -1, ArrowRight: 1 }

export function CardDialog({
  card,
  pick,
  collectible,
  open,
  onOpenChange,
  at,
  count,
  onStep,
  returnFocus,
  scope,
  collection,
  onQty,
}: Props) {
  const stats = cardStats(card)
  const n = card.printings.length

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
          returnFocus()
        }}
        // Écouté sur la modale entière, pas sur les boutons de navigation : les
        // flèches doivent marcher juste après avoir choisi une version ou ajouté
        // un exemplaire. Avec un modificateur, elles restent au navigateur.
        onKeyDown={(e) => {
          const delta = STEP_KEYS[e.key]
          if (!delta || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
          e.preventDefault()
          onStep(delta)
        }}
      >
        {/* `text-left` : le registry centre l'en-tête sur mobile, ce qui
            décalerait le titre des badges alignés à gauche en dessous. */}
        <DialogHeader className="text-left">
          {/* Navigation calée à droite, contre la croix : elle ne bouge pas d'une
              carte à l'autre, quelle que soit la longueur du nom, et l'on
              enchaîne les clics sans déplacer la souris. Absente quand la
              grille n'a qu'une carte : deux boutons grisés n'y diraient rien.
              Sous `sm`, elle passe au-dessus du titre, sur la ligne de la
              croix : à côté, elle le repliait sur quatre lignes. */}
          <div className="flex flex-col-reverse gap-2 pr-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <DialogTitle className="leading-tight">{card.name}</DialogTitle>
            {count > 1 && <Stepper name={card.name} at={at} count={count} onStep={onStep} />}
          </div>
          {/* Mêmes badges et même ligne de caractéristiques que la tuile. La
              quantité possédée n'y figure pas : elle se lit par version, dans
              `collection`, jamais dans cet instantané de la carte. */}
          <DialogDescription asChild>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1">
                <TypeBadge type={card.type} color={card.color} className="text-xs" />
                {/* Comme sur la tuile. Sans eux, « 2 impressions » d'une carte
                    déclinée par rareté se lirait comme le compte de la carte. */}
                <CollectibleBadges collectible={collectible} className="text-xs" />
                {/* Une version du Masterset ne porte qu'elle-même : compter ses
                    impressions y dirait « 1 », ce qui est faux pour la carte.
                    Déclinée, ou à un autre niveau de la collection, ce sont les
                    impressions de sa carte à collectionner. */}
                {scope !== "masterset" && (
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

        {/* `key` : changer de carte repart d'un état neuf, sur la version que
            montre sa tuile — sans passer par un rendu qui porterait encore la
            version choisie sur la carte précédente. La navigation reste hors
            de ce sous-arbre : remontée, elle perdrait le focus à chaque clic. */}
        <Versions key={card.id} card={card} pick={pick} collection={collection} onQty={onQty} />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Ce qui dépend de la version choisie : visuel, miniatures des versions,
 * informations, quantité possédée et liens.
 */
function Versions({
  card,
  pick,
  collection,
  onQty,
}: {
  card: GridCard
  pick: number
  collection: Collection
  onQty: (printing: PrintRow, qty: number) => void
}) {
  // Index dans `card.printings`, pas un uuid : c'est ce que rend
  // `printingIndex`, et le sélecteur raisonne en index.
  const [picked, setPicked] = React.useState(pick)
  const n = card.printings.length
  const shown = card.printings[Math.min(picked, n - 1)]

  if (!shown) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">Aucune impression connue pour cette carte.</p>
        <Links card={card} printing={null} />
      </div>
    )
  }

  return (
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
  )
}

/**
 * Carte précédente, rang, carte suivante.
 *
 * Grisés en bout de séquence par `aria-disabled` et non `disabled` : un bouton
 * désactivé perd le focus, qui retomberait sur `body` — hors de la modale, où
 * les flèches du clavier ne sont plus écoutées. Les deux classes reprennent le
 * rendu `disabled:` du registry.
 */
const ENDED = "aria-disabled:pointer-events-none aria-disabled:opacity-50"

function Stepper({
  name,
  at,
  count,
  onStep,
}: {
  name: string
  at: number
  count: number
  onStep: (delta: -1 | 1) => void
}) {
  return (
    // `-mt-4` : remonte les chevrons sur l'axe de la croix du registry, posée à
    // `top-4` — 24 px de marge, moins 16, plus la moitié des 32 px du bouton.
    // Alignés sur le titre, ils tombaient 10 px sous la croix voisine. À côté
    // du titre, `-mb-4` leur retire aussi toute hauteur dans la ligne.
    <div className="-mt-4 flex shrink-0 items-center self-end sm:-mb-4 sm:self-start">
      <Button
        variant="ghost"
        size="icon-sm"
        className={ENDED}
        aria-label="Carte précédente"
        aria-keyshortcuts="ArrowLeft"
        title="Carte précédente (←)"
        aria-disabled={at <= 0}
        onClick={() => onStep(-1)}
      >
        <ChevronLeft />
      </Button>
      <span aria-hidden className="text-muted-foreground px-1 font-mono text-xs tabular-nums">
        {at + 1} / {count}
      </span>
      {/* Le titre de la modale change sans être relu : c'est ici qu'on annonce
          la carte où l'on arrive. */}
      <span aria-live="polite" className="sr-only">
        {name}, carte {at + 1} sur {count}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        className={ENDED}
        aria-label="Carte suivante"
        aria-keyshortcuts="ArrowRight"
        title="Carte suivante (→)"
        aria-disabled={at >= count - 1}
        onClick={() => onStep(1)}
      >
        <ChevronRight />
      </Button>
    </div>
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
