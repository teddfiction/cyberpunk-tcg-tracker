/** Filtre multi-extensions, monté sur Popover + Command. */
import * as React from "react"
import { Check } from "lucide-react"

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
import { CONTROL_TEXT, FilterTrigger } from "@/components/controls"
import type { CodeMap } from "@/types"

type Props = {
  options: { exp: string; count: number }[]
  selected: string[]
  onChange: (next: string[]) => void
  codes: CodeMap
  expansions: Record<string, string>
}

/**
 * Sélection multiple d'extensions.
 *
 * Le `Combobox` du registry shadcn (`multiple` + `ComboboxChips`) s'appuie sur
 * @base-ui/react ; ce projet est en Radix exclusivement, d'où la recette
 * Popover + Command. Le déclencheur est celui des filtres de la grille, allumé
 * et chiffré dès qu'une extension est cochée, et non plus une rangée de chips :
 * un filtre se lit de la même façon partout. Les codes cochés restent au survol.
 */
export function ExtensionCombobox({ options, selected, onChange, codes, expansions }: Props) {
  const [open, setOpen] = React.useState(false)

  const toggle = (exp: string) =>
    onChange(selected.includes(exp) ? selected.filter((e) => e !== exp) : [...selected, exp])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterTrigger
          role="combobox"
          aria-expanded={open}
          aria-label="Filtrer par extension"
          label="Extensions"
          count={selected.length}
          title={selected.map((exp) => codes[exp]?.code || `#${exp}`).join(", ") || undefined}
        />
      </PopoverTrigger>

      {/* 384 px : le plus long libellé — « Embracing Power — Retail Starter
          Deck » — fait 290 px à lui seul, auxquels s'ajoutent l'effectif, la
          coche et les retraits. À 288 px il tronquait. Plafonné à la fenêtre
          pour ne pas déborder sur un téléphone. */}
      <PopoverContent className="notch-md w-96 max-w-[calc(100vw-2rem)] p-0" align="start">
        <Command>
          {/* Geist Mono comme les champs de recherche ; sans capitales, comme eux. */}
          <CommandInput placeholder="Chercher une extension…" className="font-mono text-xs" />
          <CommandList>
            <CommandEmpty>Aucune extension.</CommandEmpty>
            <CommandGroup>
              {options.map(({ exp, count }) => (
                <CommandItem
                  key={exp}
                  className={CONTROL_TEXT}
                  value={`${codes[exp]?.code ?? ""} ${expansions[exp] ?? exp}`}
                  onSelect={() => toggle(exp)}
                >
                  <CodeBadge exp={exp} codes={codes} expansions={expansions} />
                  {/* Le nom passe à la ligne plutôt que de se faire couper :
                      sur un téléphone, le menu est plafonné à la fenêtre et
                      les libellés les plus longs n'y tiennent pas d'un trait. */}
                  <span className="min-w-0 flex-1">{expansions[exp] ?? `Extension ${exp}`}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">{count}</span>
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
