/**
 * Menu de tri de la grille. Il lit et écrit le tri dans l'instance TanStack —
 * pas de copie React à côté : `sortIdOf` retrouve l'entrée active depuis l'état
 * de la table, qui reste seule dépositaire.
 */
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CONTROL_TEXT, FilterTrigger } from "@/components/controls"
import { SORT_IDS, SORTS, sortIdOf, type SortId } from "@/lib/sorts"
import { cn } from "@/lib/utils"

import type { SortingState } from "@tanstack/react-table"

type Props = {
  sorting: SortingState
  onSort: (sorting: SortingState) => void
}

export function SortMenu({ sorting, onSort }: Props) {
  const active: SortId = sortIdOf(sorting)

  return (
    <DropdownMenu>
      {/* Le déclencheur des filtres, jamais allumé : un tri n'écarte rien. */}
      <DropdownMenuTrigger asChild>
        <FilterTrigger aria-label="Trier les cartes" label={SORTS[active].label} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="notch-md w-64">
        {SORT_IDS.map((id) => (
          <DropdownMenuCheckboxItem
            key={id}
            // Le premier item a sa propre encoche : surligné, son coin tombait
            // dans le biais du menu, coupé à ras. Voir `FacetFilter`.
            className={cn(CONTROL_TEXT, "first:notch-sm")}
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
