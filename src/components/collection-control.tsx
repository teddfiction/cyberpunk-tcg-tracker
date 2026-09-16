/**
 * Quantité possédée d'une version, dans la modale de carte : ajout immédiat,
 * réglage, et retrait confirmé en deux temps.
 *
 * L'ajout enregistre un exemplaire tout de suite, sans étape « Valider » : une
 * quantité en attente se perdrait en fermant la modale. Le retrait reprend le
 * geste de « Oublier les données conservées » — pas de boîte de dialogue
 * empilée sur la modale, contrairement à « Supprimer ma collection ».
 */
import * as React from "react"
import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
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
      <Button ref={add} size="sm" className="self-start" onClick={() => change(1, "plus")}>
        <Plus />
        Ajouter à ma collection
      </Button>
    )
  }

  // Libellé au-dessus, commandes dessous : « Confirmer le retrait », plus large
  // que « Retirer », passait sinon à la ligne et faisait sauter la modale.
  return (
    <div className="flex flex-col gap-1.5">
      {/* Même voix que les informations de la version, juste en dessous. */}
      <span className={cn(INFO, "text-muted-foreground text-xs")}>Dans ma collection</span>

      <div className="flex items-center gap-3">
        <div className="flex items-center">
          {/* Grisé à 1 : on ne passe à zéro que par « Retirer », qui confirme. */}
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Retirer un exemplaire"
            disabled={qty <= 1}
            onClick={() => change(qty - 1, qty - 1 <= 1 ? "plus" : null)}
          >
            <Minus />
          </Button>
          <span aria-live="polite" className="w-10 text-center font-mono text-sm tabular-nums">
            {qty}
            <span className="sr-only"> {qty > 1 ? "exemplaires" : "exemplaire"}</span>
          </span>
          <Button
            ref={plus}
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Ajouter un exemplaire"
            onClick={() => change(qty + 1, null)}
          >
            <Plus />
          </Button>
        </div>

        <Button
          variant={confirming ? "destructive" : "ghost"}
          size="sm"
          onClick={() => {
            if (!confirming) return setConfirming(true)
            setConfirming(false)
            change(0, "add")
          }}
          onBlur={() => setConfirming(false)}
        >
          <Trash2 />
          {confirming ? "Confirmer le retrait" : "Retirer"}
        </Button>
      </div>
    </div>
  )
}
