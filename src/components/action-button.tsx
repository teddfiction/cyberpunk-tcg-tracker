/**
 * Bouton d'action : une touche de machine analogique — aplat franc, libellé en
 * capitales Geist Mono comme toute commande, encoche. Noir en clair et blanc
 * en sombre pour une action ordinaire, jaune pour l'action principale d'un
 * écran, rouge pour ce qui efface, cyan (`secondary`) pour « Réinitialiser ».
 * Aucune action en `ghost` ni en `outline` : elle doit se repérer d'un coup
 * d'œil, et ne pas se confondre avec un filtre, bordé et sans aplat tant qu'il
 * est éteint.
 *
 * Une exception, `danger-outline` : le premier temps d'un effacement confirmé
 * dans le bouton. Le contour rouge annonce le geste, l'aplat rouge du second
 * temps dit qu'il est armé — le changement d'état se voit, pas seulement le
 * libellé.
 */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { Button } from "@/components/ui/button"
import { CONTROL_TEXT } from "@/components/controls"
import { cn } from "@/lib/utils"

/**
 * Posé sur la variante `default` du registry, la seule sans classe `dark:` :
 * `cn` y arbitre fond, texte et survol, là où `outline` ou `ghost` garderaient
 * leurs aplats sombres par-dessus les nôtres. Sans bordure visible : l'aplat
 * se détache seul, dans les deux thèmes. Elle reste transparente pour que le
 * focus la colore, comme sur les filtres.
 */
const actionVariants = cva(
  cn(
    CONTROL_TEXT,
    "notch-sm h-10 gap-2 border border-transparent px-4 font-semibold has-[>svg]:px-4 active:translate-y-px"
  ),
  {
    variants: {
      tone: {
        default: "bg-action text-action-foreground hover:bg-action-hover",
        primary: "bg-primary text-selected-foreground hover:bg-primary/85",
        danger: "bg-danger text-danger-foreground hover:bg-danger-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/85",
        // `destructive` et non `danger` : en texte sur le noir, le red-600 de
        // l'aplat tombe à 3,6:1 ; le red-400 du thème sombre y lit à 7:1.
        "danger-outline":
          "border-destructive text-destructive hover:bg-destructive/10 bg-transparent",
      },
      size: {
        default: "",
        icon: "size-10 px-0 has-[>svg]:px-0",
      },
    },
    defaultVariants: { tone: "default", size: "default" },
  }
)

type Props = Omit<React.ComponentProps<typeof Button>, "variant" | "size"> &
  VariantProps<typeof actionVariants>

export function ActionButton({ tone, size, className, ...props }: Props) {
  return <Button className={cn(actionVariants({ tone, size }), className)} {...props} />
}
