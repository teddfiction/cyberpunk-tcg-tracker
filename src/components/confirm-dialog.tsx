/**
 * Confirmation d'un effacement, en boîte de dialogue : le geste s'arrête sur
 * ce qui sera perdu, « Annuler » garde le focus, l'action est en rouge. Pour
 * les gestes de Paramètres, qui n'est pas une modale ; dans la modale de
 * carte, une boîte s'empilerait sur une autre — la confirmation s'y fait en
 * deux temps, dans le bouton (`CollectionControl`).
 */
import * as React from "react"
import { Trash2 } from "lucide-react"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ActionButton } from "@/components/action-button"

type Props = {
  /** Le bouton qui ouvre la boîte — un `ActionButton`, posé en `asChild`. */
  trigger: React.ReactNode
  title: string
  /** Ce qui sera perdu, et ce qui ne l'est pas. */
  description: React.ReactNode
  /** Libellé de l'action, le verbe seul : « Supprimer », « Oublier ». */
  confirm: string
  onConfirm: () => void
  /** Un repli, à gauche du pied, qui ne ferme pas la boîte : « Exporter d'abord ». */
  extra?: React.ReactNode
}

export function ConfirmDialog({ trigger, title, description, confirm, onConfirm, extra }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>

      {/* Encochée comme toute modale. */}
      <AlertDialogContent className="notch-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {extra}
          {/* Les primitives de Radix, et non `AlertDialogCancel` ou
              `AlertDialogAction` du registry : ceux-ci posent leurs classes
              par `asChild`, que `cn` n'arbitre pas — leur aplat se disputerait
              celui du bouton d'action à l'ordre des utilitaires. */}
          <AlertDialogPrimitive.Cancel asChild>
            <ActionButton>Annuler</ActionButton>
          </AlertDialogPrimitive.Cancel>
          <AlertDialogPrimitive.Action asChild>
            <ActionButton tone="danger" onClick={onConfirm}>
              <Trash2 />
              {confirm}
            </ActionButton>
          </AlertDialogPrimitive.Action>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
