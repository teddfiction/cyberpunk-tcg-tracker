/**
 * Menu de tri de la grille. Il lit et écrit le tri dans l'instance TanStack —
 * pas de copie React à côté : `sortIdOf` retrouve l'entrée active depuis l'état
 * de la table, qui reste seule dépositaire.
 */
import { ChevronDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SORT_IDS, SORTS, sortIdOf, type SortId } from "@/lib/sorts"

import type { SortingState } from "@tanstack/react-table"

type Props = {
  sorting: SortingState
  onSort: (sorting: SortingState) => void
}

export function SortMenu({ sorting, onSort }: Props) {
  const active: SortId = sortIdOf(sorting)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Trier les cartes"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        >
          <span className="truncate">{SORTS[active].label}</span>
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {SORT_IDS.map((id) => (
          <DropdownMenuCheckboxItem
            key={id}
            checked={id === active}
            // Un seul tri à la fois : décocher l'actif n'a pas de sens, on
            // ignore, comme le ferait un groupe radio.
            onCheckedChange={(next) => next && onSort([...SORTS[id].sorting])}
          >
            {SORTS[id].label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
