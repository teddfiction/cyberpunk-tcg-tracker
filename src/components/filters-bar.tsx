import { RotateCcw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExtensionCombobox } from "@/components/extension-combobox"
import type { CodeMap, Filters, Mode } from "@/types"

type Props = {
  filters: Filters
  patch: (p: Partial<Filters>) => void
  setMode: (m: Mode) => void
  reset: () => void
  options: { exp: string; count: number }[]
  codes: CodeMap
  expansions: Record<string, string>
  shown: number
  total: number
}

export function FiltersBar({
  filters,
  patch,
  setMode,
  reset,
  options,
  codes,
  expansions,
  shown,
  total,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={filters.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="Chercher une carte, un code, un ID…"
            className="pl-8"
          />
        </div>

        <Tabs value={filters.mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="normal">Normal</TabsTrigger>
            <TabsTrigger value="foil">Foil</TabsTrigger>
            <TabsTrigger value="card">Par carte</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <ExtensionCombobox
          options={options}
          selected={filters.exps}
          onChange={(exps) => patch({ exps })}
          codes={codes}
          expansions={expansions}
        />

        <div className="flex items-center gap-2">
          <Checkbox
            id="hideEmpty"
            checked={filters.hideEmpty}
            onCheckedChange={(v) => patch({ hideEmpty: !!v })}
          />
          <Label htmlFor="hideEmpty" className="font-normal">
            Masquer les lignes sans prix
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="onlySingles"
            checked={filters.onlySingles}
            onCheckedChange={(v) => patch({ onlySingles: !!v })}
          />
          <Label htmlFor="onlySingles" className="font-normal">
            Singles uniquement
          </Label>
        </div>

        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw />
          Réinitialiser
        </Button>

        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {shown} / {total} {filters.mode === "card" ? "cartes" : "produits"}
        </span>
      </div>
    </div>
  )
}
