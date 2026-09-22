/**
 * Le compte de ce que la vue montre — lignes retenues sur total —, seul sur sa
 * ligne, entre les commandes et le contenu.
 *
 * Il fermait la dernière rangée de commandes, calé à droite, où il se lisait
 * comme l'une d'elles et se perdait quand la rangée passait à la ligne. Seul,
 * il se retrouve ; et le blanc qu'il pose de part et d'autre sépare le haut de
 * page du contenu, dans la table des cotes comme dans les grilles.
 *
 * Aligné à gauche, au fer du contenu qu'il annonce. Voix des données, comme les
 * repères chiffrés : Geist Mono en capitales.
 */
import * as React from "react"

import { INFO } from "@/components/card-info"
import { cn } from "@/lib/utils"

export function CountLine({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        INFO,
        "text-muted-foreground py-2 text-xs tracking-wide tabular-nums",
        className
      )}
      {...props}
    />
  )
}
