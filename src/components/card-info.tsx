/**
 * Informations de carte, dans la voix de la grille : Geist Mono en capitales,
 * libellé terne, valeur contrastée. Tuile et modale puisent ici, ce qui garde une
 * carte identique d'une vue à l'autre — seule la taille change, par `className`.
 */
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { colorVar } from "@/data/colors"
import { cn } from "@/lib/utils"
import type { CardStat } from "@/lib/printings"

/** Geist Mono en capitales : ce qui fait reconnaître une information de carte. */
export const INFO = "font-mono uppercase"

/**
 * Badge en contour. Même graisse que la ligne de caractéristiques : les badges
 * accompagnent l'illustration, ils ne lui disputent pas le regard.
 */
export function InfoBadge({ className, ...props }: React.ComponentProps<typeof Badge>) {
  return <Badge variant="outline" className={cn(INFO, "text-[10px]", className)} {...props} />
}

/** Le type, teinté de la couleur de la carte : seule couleur que portent les badges. */
export function TypeBadge({
  type,
  color,
  className,
}: {
  type: string | null
  color: string | null
  className?: string
}) {
  if (!type) return null
  const tint = colorVar(color)
  return (
    <InfoBadge
      className={className}
      style={tint ? { color: tint, borderColor: tint } : undefined}
    >
      {type}
    </InfoBadge>
  )
}

/**
 * La ligne de caractéristiques.
 *
 * Chaque information est un bloc insécable — c'est elle qui passe à la ligne,
 * jamais ses caractères. Pas de séparateur : c'est l'écart qui sépare, ce qui
 * évite aussi qu'un point se retrouve orphelin en bout de ligne.
 */
export function StatLine({
  stats,
  color,
  className,
}: {
  stats: CardStat[]
  color: string | null
  className?: string
}) {
  const tint = colorVar(color)
  return (
    <div className={cn(INFO, "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]", className)}>
      {stats.map((s) => (
        <span key={s.label} className="flex items-center gap-1 whitespace-nowrap">
          {s.dot && tint && (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: tint }}
              title={color ?? undefined}
            />
          )}
          <span className="text-muted-foreground">{s.label}</span>
          {s.value && <span className="text-foreground font-medium">{s.value}</span>}
        </span>
      ))}
    </div>
  )
}

/** Informations en deux colonnes, libellé à gauche : la même voix, en liste. */
export function InfoList({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      className={cn(INFO, "grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs", className)}
      {...props}
    />
  )
}

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground min-w-0 font-medium break-words">{children}</dd>
    </>
  )
}

/** Information inconnue : un tiret, plus terne que tout libellé. */
export const Unknown = () => <span className="text-muted-foreground/50">—</span>
