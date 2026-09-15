/**
 * Vignette d'une carte, avec la carte entière au survol.
 *
 * Il n'y a pas d'image plus grande à aller chercher : les URLs CloudFront de
 * Netdeck exigent une signature qui expire, donc l'aperçu montre la miniature à
 * sa taille native (320 px, voir `npm run data:netdeck:images`).
 */
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

/**
 * Ratio natif des miniatures, mesuré : 320 × 447. Déclaré plutôt que laissé à
 * l'image pour deux raisons — la place est réservée avant le décodage, donc les
 * 319 lignes ne sautent pas au fil du chargement paresseux ; et le carré vide
 * d'une carte sans visuel occupe exactement la même.
 *
 * `object-contain` par-dessus : si une miniature arrivait un jour dans un autre
 * format, elle serait affichée en entier plutôt que rognée comme avant.
 */
const THUMB = "w-12 aspect-[320/447]"

export function CardThumb({ thumb, name }: { thumb: string | null; name: string }) {
  if (!thumb) return <div className={cn("border-border/60 bg-muted border", THUMB)} aria-hidden />

  return (
    <HoverCard openDelay={120} closeDelay={60}>
      <HoverCardTrigger asChild>
        <img
          src={thumb}
          alt={name}
          loading="lazy"
          className={cn("border-border cursor-zoom-in border object-contain", THUMB)}
        />
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-auto border p-1">
        <img src={thumb} alt={name} className="block w-80 max-w-none" />
      </HoverCardContent>
    </HoverCard>
  )
}
