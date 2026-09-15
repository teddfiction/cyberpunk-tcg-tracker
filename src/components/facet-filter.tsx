/**
 * Un filtre à facette : un déclencheur portant le nombre de choix actifs, et un
 * menu de cases à cocher avec leurs effectifs.
 *
 * Construit sur `DropdownMenu` + `DropdownMenuCheckboxItem` : l'indicateur du
 * registry est déjà posé à gauche du libellé, rien à surcharger. Le champ de
 * recherche est un `Input` ordinaire — cmdk ne peut pas vivre dans un menu
 * Radix, les deux se disputent les flèches et la frappe.
 */
import * as React from "react"
import { ChevronDown, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { matchOptions, type FacetOption } from "@/lib/facets"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  options: FacetOption[]
  selected: string[]
  onChange: (next: string[]) => void
}

/** Au-delà, la liste ne se parcourt plus à l'œil : elle gagne un champ. */
const SEARCHABLE = 8

export function FacetFilter({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const input = React.useRef<HTMLInputElement>(null)

  const shown = React.useMemo(() => matchOptions(options, query), [options, query])
  const searchable = options.length > SEARCHABLE

  // Un menu Radix focalise toujours son premier item et n'expose pas
  // `onOpenAutoFocus` pour l'en empêcher. On repasse derrière lui à la frame
  // suivante, une fois le contenu monté.
  React.useEffect(() => {
    if (!open || !searchable) return
    const frame = requestAnimationFrame(() => input.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open, searchable])

  const toggle = (value: string) =>
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    )

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Filtrer par ${label.toLowerCase()}`}
          disabled={!options.length}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-default disabled:opacity-50",
            selected.length && "border-ring"
          )}
        >
          <span className={cn(!selected.length && "text-muted-foreground")}>{label}</span>
          {selected.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
        {searchable && (
          <div className="relative mb-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher…"
              className="h-8 pl-8"
              // La frappe reste au champ, sinon la recherche au clavier du menu
              // Radix l'avale et saute d'option en option. Échap remonte, pour
              // refermer. Les flèches de Radix ne partent que d'un item déjà
              // focalisé : depuis le champ, on pousse nous-mêmes vers le premier.
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault()
                  const menu = e.currentTarget.closest("[role=menu]")
                  menu?.querySelector<HTMLElement>("[role=menuitemcheckbox]")?.focus()
                  return
                }
                if (e.key !== "Escape") e.stopPropagation()
              }}
            />
          </div>
        )}

        {shown.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-center text-sm">Aucun résultat.</p>
        ) : (
          shown.map(({ value, count }) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={selected.includes(value)}
              // La bascule est dans `onSelect`, qui sert le clic comme la
              // touche Entrée, plutôt que dans `onCheckedChange` qu'il faudrait
              // accorder avec. Son `preventDefault` garde le menu ouvert : on
              // vient souvent cocher plusieurs options d'affilée.
              onSelect={(e) => {
                e.preventDefault()
                toggle(value)
              }}
            >
              <span className="truncate">{value}</span>
              <span className="text-muted-foreground ml-auto pl-2 text-xs tabular-nums">
                {count}
              </span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
