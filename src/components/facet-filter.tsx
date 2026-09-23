/**
 * Un filtre à facette : un déclencheur allumé et chiffré dès qu'un choix est
 * actif (`FilterTrigger`), et un menu de cases à cocher avec leurs effectifs.
 *
 * Construit sur `DropdownMenu` + `DropdownMenuCheckboxItem` : l'indicateur du
 * registry est déjà posé à gauche du libellé, rien à surcharger. Le champ de
 * recherche est un `Input` ordinaire — cmdk ne peut pas vivre dans un menu
 * Radix, les deux se disputent les flèches et la frappe.
 */
import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CONTROL_TEXT, FilterTrigger, SearchField } from "@/components/controls"
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
        <FilterTrigger
          aria-label={`Filtrer par ${label.toLowerCase()}`}
          disabled={!options.length}
          label={label}
          count={selected.length}
        />
      </DropdownMenuTrigger>

      {/* Le menu ne défile pas, sa liste si : le filet de l'encoche est posé
          sur le menu, et partirait avec son contenu. Le champ de recherche y
          gagne de rester en vue. */}
      <DropdownMenuContent
        align="start"
        className="notch-md flex max-h-80 w-64 flex-col overflow-hidden"
      >
        {searchable && (
          <SearchField
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher…"
            className="mb-1 h-9 shrink-0"
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
        )}

        <div className="min-h-0 overflow-y-auto">
          {shown.length === 0 ? (
            <p className="text-muted-foreground px-2 py-3 text-center text-sm">Aucun résultat.</p>
          ) : (
            shown.map(({ value, count }) => (
              <DropdownMenuCheckboxItem
                key={value}
                // Sans champ de recherche, le premier item occupe le coin du
                // menu : surligné, le biais de 16 px le coupait à ras, là où 4
                // px le séparent des bords. Sa propre encoche lui rend un biais
                // parallèle — celui du champ, quand il y en a un.
                className={cn(CONTROL_TEXT, !searchable && "first:notch-sm")}
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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
