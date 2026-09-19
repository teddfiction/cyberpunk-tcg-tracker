/**
 * Badge de la charte : celui du registry, droit et non arrondi, avec l'encoche
 * des commandes au gabarit `xs`. Tous les badges de l'app passent par lui —
 * type et rareté d'une carte, code d'impression, compte d'un filtre allumé.
 */
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function NotchBadge({ className, ...props }: React.ComponentProps<typeof Badge>) {
  return <Badge className={cn("notch-xs rounded-none", className)} {...props} />
}
