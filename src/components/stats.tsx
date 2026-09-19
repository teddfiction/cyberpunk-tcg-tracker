/**
 * Repères chiffrés, partagés par la table des cotes et la collection : un
 * module par repère, à la largeur de son contenu plutôt qu'une bande étirée
 * sur toute la page pour trois ou quatre nombres. Libellé et valeur parlent la
 * voix des données, Geist Mono ; bordure `border` sans aplat — ce sont des
 * données, pas des commandes.
 */
import * as React from "react"

import { Progress } from "@/components/ui/progress"
import { INFO } from "@/components/card-info"
import { cn } from "@/lib/utils"

/** Les modules côte à côte, qui passent à la ligne plutôt que de se serrer. */
export function Stats({ className, ...props }: React.ComponentProps<"dl">) {
  return <dl className={cn("flex flex-wrap gap-2", className)} {...props} />
}

/**
 * Un repère : libellé terne au-dessus, valeur en dessous.
 *
 * `progress` pose une barre sur la ligne du libellé, qu'elle prolonge jusqu'au
 * bord du module : la valeur garde sa ligne, et le module ne s'élargit pas
 * pour elle. Cyan (`secondary`) sur 4 px, sa piste à 20 %. Masquée aux
 * lecteurs d'écran : le `Progress` du registry ne transmet pas `value` à
 * Radix, qui l'annoncerait indéterminée — les chiffres de la valeur disent
 * déjà tout.
 */
export function Stat({
  label,
  progress,
  children,
}: {
  label: string
  /** Part en pour cent, en barre à côté du libellé. */
  progress?: number
  children: React.ReactNode
}) {
  return (
    <div className="notch-sm flex flex-col gap-1 border px-3 py-2">
      <dt
        className={cn(
          INFO,
          "text-muted-foreground flex items-center gap-3 text-[10px] tracking-wide"
        )}
      >
        {label}
        {progress != null && (
          <Progress
            aria-hidden
            value={progress}
            className="bg-secondary/20 *:data-[slot=progress-indicator]:bg-secondary h-1 min-w-16 flex-1 rounded-none"
          />
        )}
      </dt>
      <dd className="flex items-center gap-3 font-mono text-lg font-semibold tabular-nums">
        {children}
      </dd>
    </div>
  )
}

/**
 * « 87 / 152 » : le total en retrait. `percent` le suit entre parenthèses,
 * dans le même retrait — « 87 / 152 (57 %) ».
 */
export function Of({ n, total, percent }: { n: number; total: number; percent?: number }) {
  return (
    <span className="whitespace-nowrap">
      {n}
      <span className="text-muted-foreground text-sm font-normal">
        {" "}
        / {total}
        {percent != null && ` (${percent} %)`}
      </span>
    </span>
  )
}
