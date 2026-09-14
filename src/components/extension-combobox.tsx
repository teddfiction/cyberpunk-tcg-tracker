/** Filtre multi-extensions à chips, monté sur Popover + Command + Badge. */
import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"

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
import { CodeBadge } from "@/components/code-badge"
import type { CodeMap } from "@/types"

const MAX_CHIPS = 2

type Props = {
  options: { exp: string; count: number }[]
  selected: string[]
  onChange: (next: string[]) => void
  codes: CodeMap
  expansions: Record<string, string>
}

/**
 * Sélection multiple à chips.
 *
 * Le `Combobox` du registry shadcn (`multiple` + `ComboboxChips`) s'appuie sur
 * @base-ui/react ; ce projet est en Radix exclusivement, d'où la recette
 * Popover + Command + Badge. Au-delà de deux chips on replie en « +N » pour que
 * le déclencheur tienne sur la ligne de filtres.
 */
export function ExtensionCombobox({ options, selected, onChange, codes, expansions }: Props) {
  const [open, setOpen] = React.useState(false)

  const toggle = (exp: string) =>
    onChange(selected.includes(exp) ? selected.filter((e) => e !== exp) : [...selected, exp])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          aria-label="Filtrer par extension"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 min-w-0 shrink-0 max-w-full items-center gap-1 border bg-transparent px-2 text-left text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        >
          {selected.length === 0 && <span className="text-muted-foreground px-1">Extensions</span>}

          {selected.slice(0, MAX_CHIPS).map((exp) => (
            <Badge key={exp} variant="secondary" className="gap-1 font-mono text-[11px]">
              {codes[exp]?.code || `#${exp}`}
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Retirer ${expansions[exp] ?? exp}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(exp)
                }}
              >
                <X className="size-3" />
              </span>
            </Badge>
          ))}

          {selected.length > MAX_CHIPS && (
            <Badge variant="secondary" className="font-mono text-[11px]">
              +{selected.length - MAX_CHIPS}
            </Badge>
          )}

          <ChevronDown className="text-muted-foreground ml-1 size-4 shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Chercher une extension…" />
          <CommandList>
            <CommandEmpty>Aucune extension.</CommandEmpty>
            <CommandGroup>
              {options.map(({ exp, count }) => (
                <CommandItem
                  key={exp}
                  value={`${codes[exp]?.code ?? ""} ${expansions[exp] ?? exp}`}
                  onSelect={() => toggle(exp)}
                >
                  <CodeBadge exp={exp} codes={codes} expansions={expansions} />
                  <span className="truncate">{expansions[exp] ?? `Extension ${exp}`}</span>
                  <span className="text-muted-foreground ml-auto tabular-nums">{count}</span>
                  {selected.includes(exp) && <Check className="size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
