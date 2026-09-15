/**
 * Vignette d'une carte, avec la carte entière au survol.
 *
 * Il n'y a pas d'image plus grande à aller chercher : les URLs CloudFront de
 * Netdeck exigent une signature qui expire, donc l'aperçu montre la miniature à
 * sa taille native (320 px, voir `npm run data:netdeck:images`).
 */
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

export function CardThumb({ thumb, name }: { thumb: string | null; name: string }) {
  if (!thumb) return <div className="border-border/60 bg-muted h-10 w-7 border" aria-hidden />

  return (
    <HoverCard openDelay={120} closeDelay={60}>
      <HoverCardTrigger asChild>
        <img
          src={thumb}
          alt={name}
          loading="lazy"
          className="border-border h-10 w-7 cursor-zoom-in border object-cover"
        />
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-auto border p-1">
        <img src={thumb} alt={name} className="block w-80 max-w-none" />
      </HoverCardContent>
    </HoverCard>
  )
}
