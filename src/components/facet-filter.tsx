/**
 * Un filtre à facette : un déclencheur portant le nombre de choix actifs, et
 * une liste de cases à cocher avec leurs effectifs.
 *
 * Construit sur Popover + Command + Badge, comme le filtre d'extensions : le
 * `Combobox` du registry shadcn dépend de @base-ui/react, que ce projet exclut.
 */
import { Check, ChevronDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { FacetOption } from "@/lib/facets"

type Props = {
  label: string
  options: FacetOption[]
  selected: string[]
  onChange: (next: string[]) => void
}

export function FacetFilter({ label, options, selected, onChange }: Props) {
  const toggle = (value: string) =>
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-label={`Filtrer par ${label.toLowerCase()}`}
          disabled={!options.length}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 shrink-0 items-center gap-1.5 border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50",
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
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          {options.length > 8 && <CommandInput placeholder={`Chercher…`} />}
          <CommandList>
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            <CommandGroup>
              {options.map(({ value, count }) => (
                <CommandItem key={value} value={value} onSelect={() => toggle(value)}>
                  <span className="truncate">{value}</span>
                  <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                    {count}
                  </span>
                  {selected.includes(value) && <Check className="size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
