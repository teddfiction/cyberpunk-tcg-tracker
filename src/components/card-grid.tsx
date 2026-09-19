/**
 * Grille de cartes. Une tuile par carte ; cliquer l'ouvre en modale sur ses
 * impressions, dont chacune a son propre visuel — c'est là que se voient les
 * variantes de rareté que Cardmarket ne distingue pas. Dans la collection, une
 * tuile par carte à collectionner ou par version, selon le niveau, et le visuel
 * en retrait pour celles qui manquent.
 *
 * Cocher une rareté décline chaque carte en ses cartes à collectionner — une
 * tuile par rareté cochée, et par illustration alternative (voir `gridRows`) :
 * chacune montre son illustration, et sa modale n'en présente que les versions.
 *
 * La modale passe d'une carte à l'autre dans l'ordre de la grille, tri et
 * filtres compris : on constitue sa collection sans la refermer à chaque carte.
 */
import * as React from "react"
import { Check, Layers } from "lucide-react"

import { CardDialog } from "@/components/card-dialog"
import { CollectibleBadges, InfoBadge, StatLine, TypeBadge } from "@/components/card-info"
import {
  collectibleText,
  focusTarget,
  printingIndex,
  tileCollectible,
  tileStats,
} from "@/lib/printings"
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

/** Visuel d'une tuile manquante : présent, mais en retrait de ceux qu'on possède. */
const MISSING = "opacity-40"

export function CardGrid({ cards, rarities, scope, collection, onQty, empty }: Props) {
  // Séquence que parcourt la modale : la grille telle qu'elle était au clic, et
  // le rang de la carte montrée. Un instantané plutôt que `cards`, qui bouge
  // sous la modale ouverte — une carte ajoutée en sort quand seules les
  // manquantes sont affichées, un tri par exemplaires la déplace : « suivante »
  // sauterait une carte, et « précédente » ne ramènerait plus à celle qu'on
  // vient de quitter.
  // Pas remise à `null` à la fermeture : la modale la rend encore pendant son
  // animation de sortie. C'est `open` qui pilote, pas elle.
  const [browse, setBrowse] = React.useState<{ cards: GridCard[]; at: number } | null>(null)
  const [open, setOpen] = React.useState(false)
  // Boutons des tuiles montées, par carte : le focus y revient en sortant.
  const tiles = React.useRef(new Map<string, HTMLButtonElement>())

  const card = browse?.cards[browse.at]

  const select = (at: number) => {
    setBrowse({ cards, at })
    setOpen(true)
  }

  // Sans effet en bout de séquence : on ne boucle pas, arriver au bout dit
  // qu'on a tout vu.
  const step = (delta: -1 | 1) =>
    setBrowse((b) => (b?.cards[b.at + delta] ? { ...b, at: b.at + delta } : b))

  // La tuile de la carte montrée, et non celle qu'on avait cliquée : après
  // vingt cartes parcourues, c'est là qu'on en est dans la grille.
  const returnFocus = () => {
    if (!browse) return
    const id = focusTarget(browse.cards, browse.at, (id) => tiles.current.has(id))
    if (id) tiles.current.get(id)?.focus()
  }

  return (
    <>
      {/* La grille vide ne démonte pas la modale : ajouter la dernière carte
          qui manque, « Manquantes » choisi, ou retirer la dernière possédée,
          « Possédées » choisi, fait disparaître sa tuile sous la modale. */}
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
          {cards.map((c, i) => (
            <Tile
              key={c.id}
              card={c}
              rarities={rarities}
              scope={scope}
              onSelect={() => select(i)}
              tileRef={(el) => {
                if (!el) return
                tiles.current.set(c.id, el)
                return () => {
                  tiles.current.delete(c.id)
                }
              }}
            />
          ))}
        </div>
      )}

      {browse && card && (
        <CardDialog
          card={card}
          // La version que montre la tuile de cette carte, comme au clic.
          pick={printingIndex(card, rarities)}
          collectible={tileCollectible(card, scope, rarities)}
          open={open}
          onOpenChange={setOpen}
          at={browse.at}
          count={browse.cards.length}
          onStep={step}
          returnFocus={returnFocus}
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
  tileRef,
}: {
  card: GridCard
  rarities: string[]
  scope: Scope
  onSelect: () => void
  tileRef: React.RefCallback<HTMLButtonElement>
}) {
  const stats = tileStats(card)
  // L'impression mise en avant : celle de la rareté filtrée, à défaut la
  // version par défaut de la carte.
  const pick = printingIndex(card, rarities)
  const shown = card.printings[pick]
  // Dans la collection seulement : la base n'estompe rien, elle ne mesure pas
  // une complétion.
  const missing = scope !== "all" && card.owned === 0
  const collectible = tileCollectible(card, scope, rarities)

  return (
    <div className={cn("flex flex-col gap-2", OFFSCREEN)}>
      <button
        ref={tileRef}
        onClick={onSelect}
        aria-haspopup="dialog"
        // Rareté et version distinguent deux tuiles d'une même carte, que
        // seul l'artwork séparerait sinon — et un lecteur d'écran ne le voit pas.
        aria-label={
          `${card.name}${collectible ? ` (${collectibleText(collectible)})` : ""} — ` +
          (card.printings.length > 1 ? "voir les versions" : "voir la version")
        }
        className="focus-visible:ring-ring/50 block cursor-pointer outline-none focus-visible:ring-[3px]"
      >
        {/* Sans bordure : l'illustration se suffit, et le cadre dessiné sur la
            carte elle-même en tenait déjà lieu.
            Une tuile manquante n'estompe que son visuel : nom, badges et
            caractéristiques gardent leur contraste, et restent lisibles. */}
        {shown?.thumb ? (
          <img src={shown.thumb} alt={card.name} className={cn("w-full", missing && MISSING)} />
        ) : (
          <div className={cn("bg-muted aspect-[5/7] w-full", missing && MISSING)} />
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
          {/* Une tuile de la collection, ou une carte déclinée par rareté :
              rareté et version la distinguent d'une autre tuile de la même
              carte, que seul l'artwork séparerait sinon. */}
          <CollectibleBadges collectible={collectible} />
          {/* Une version du Masterset n'a qu'une impression : le compte n'y
              dirait rien. Une carte à collectionner a ses réimpressions. */}
          {scope !== "masterset" && card.printings.length > 1 && (
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
