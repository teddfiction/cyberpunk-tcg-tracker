/**
 * Quantité possédée d'une version, dans la modale de carte : ajout immédiat,
 * réglage, et retrait confirmé en deux temps.
 *
 * L'ajout enregistre un exemplaire tout de suite, sans étape « Valider » : une
 * quantité en attente se perdrait en fermant la modale. Le retrait se confirme
 * en deux temps dans le bouton, et non par une boîte de dialogue comme les
 * effacements de Paramètres (`ConfirmDialog`) : elle s'empilerait sur la modale.
 */
import * as React from "react"
import { Minus, Plus, Trash2 } from "lucide-react"

import { ActionButton } from "@/components/action-button"
import { INFO } from "@/components/card-info"
import { cn } from "@/lib/utils"

type Props = {
  qty: number
  onChange: (qty: number) => void
}

export function CollectionControl({ qty, onChange }: Props) {
  const [confirming, setConfirming] = React.useState(false)
  const add = React.useRef<HTMLButtonElement>(null)
  const plus = React.useRef<HTMLButtonElement>(null)
  // Le bouton cliqué disparaît ou se désactive : sans cible explicite, le focus
  // retomberait sur `body` et le clavier repartirait du haut de la modale.
  const focusNext = React.useRef<"add" | "plus" | null>(null)

  React.useEffect(() => {
    if (focusNext.current === "add") add.current?.focus()
    if (focusNext.current === "plus") plus.current?.focus()
    focusNext.current = null
  }, [qty])

  const change = (next: number, focus: "add" | "plus" | null) => {
    focusNext.current = focus
    onChange(next)
  }

  if (qty <= 0) {
    return (
      <ActionButton ref={add} tone="primary" className="self-start" onClick={() => change(1, "plus")}>
        <Plus />
        Ajouter à ma collection
      </ActionButton>
    )
  }

  // Libellé au-dessus, commandes dessous : « Confirmer le retrait », plus large
  // que « Retirer », passait sinon à la ligne et faisait sauter la modale.
  return (
    <div className="flex flex-col gap-1.5">
      {/* Même voix que les informations de la version, juste au-dessus. */}
      <span className={cn(INFO, "text-muted-foreground text-xs")}>Dans ma collection</span>

      <div className="flex items-center gap-3">
        <div className="flex items-center">
          {/* Grisé à 1 : on ne passe à zéro que par « Retirer », qui confirme. */}
          <ActionButton
            size="icon"
            aria-label="Retirer un exemplaire"
            disabled={qty <= 1}
            onClick={() => change(qty - 1, qty - 1 <= 1 ? "plus" : null)}
          >
            <Minus />
          </ActionButton>
          <span aria-live="polite" className="w-10 text-center font-mono text-sm tabular-nums">
            {qty}
            <span className="sr-only"> {qty > 1 ? "exemplaires" : "exemplaire"}</span>
          </span>
          <ActionButton
            ref={plus}
            size="icon"
            aria-label="Ajouter un exemplaire"
            onClick={() => change(qty + 1, null)}
          >
            <Plus />
          </ActionButton>
        </div>

        {/* Contour rouge au premier temps, aplat rouge au second : le retrait
            armé se voit, pas seulement au libellé. */}
        <ActionButton
          tone={confirming ? "danger" : "danger-outline"}
          onClick={() => {
            if (!confirming) return setConfirming(true)
            setConfirming(false)
            change(0, "add")
          }}
          onBlur={() => setConfirming(false)}
        >
          <Trash2 />
          {confirming ? "Confirmer le retrait" : "Retirer"}
        </ActionButton>
      </div>
    </div>
  )
}
