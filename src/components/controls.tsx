/**
 * Commandes à état, partagées par la table des cotes et la grille de cartes :
 * déclencheur de menu, bascule, groupe d'options, champ de recherche. Un seul
 * gabarit — 40 px, bordure `input`, encoche, Geist Mono en capitales —, et deux
 * états : éteint, bordé sur le fond de la page ; allumé, aplat jaune et texte
 * noir, comme le bouton d'une console dont la lampe s'allume. Les boutons
 * d'action ont un aplat dès le repos (`ActionButton`) : ce qui règle
 * l'affichage ne se confond pas avec ce qui agit.
 */
import * as React from "react"
import { ChevronDown, Search } from "lucide-react"
import { Toggle as TogglePrimitive, ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { NotchBadge } from "@/components/notch-badge"
import { cn } from "@/lib/utils"

/**
 * Voix de tout ce qui se manipule — actions, filtres, options, onglets, menus,
 * navigation : Geist Mono en capitales, comme les informations de carte. La
 * graisse, elle, varie : pleine sur une commande, normale dans une liste.
 */
export const CONTROL_TEXT = "font-mono text-xs tracking-wide uppercase"

/** Hauteur, bordure, texte et focus : ceux des boutons d'action et du champ de recherche. */
const CONTROL = cn(
  CONTROL_TEXT,
  "focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 border px-3 font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
)

/** Éteint : bordé, sans aplat — le fond de la page passe. */
const OFF = "border-input text-foreground hover:bg-accent bg-transparent"

/**
 * Allumé : filtre actif, option choisie. Texte noir pur, et non le brun du
 * thème Yellow : ~11:1 sur le jaune. Pas de survol : une lampe allumée le reste.
 */
const LIT = "border-primary bg-primary text-selected-foreground"

/** Les deux seules apparences d'une commande à état. */
const lamp = (lit: boolean) => (lit ? LIT : OFF)

/**
 * Déclencheur d'un menu de filtre ou de tri, allumé dès qu'un choix y est
 * actif — leur nombre en chiffres jaunes sur noir, comme un afficheur. Posé
 * sous un `Trigger asChild` de Radix, qui lui passe ref, état et gestionnaires.
 */
export function FilterTrigger({
  label,
  count = 0,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  label: string
  /** Choix actifs ; zéro, le déclencheur reste éteint. */
  count?: number
}) {
  return (
    <button type="button" className={cn(CONTROL, lamp(count > 0), "notch-sm", className)} {...props}>
      <span className="truncate">{label}</span>
      {count > 0 && (
        <NotchBadge className="bg-selected-foreground text-primary px-1.5 tabular-nums">
          {count}
        </NotchBadge>
      )}
      <ChevronDown className="opacity-60" />
    </button>
  )
}

/** Bascule d'un filtre, allumée quand il s'applique. Radix y pose `aria-pressed`. */
export function FilterToggle({
  pressed,
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & { pressed: boolean }) {
  return (
    <TogglePrimitive.Root
      pressed={pressed}
      className={cn(CONTROL, lamp(pressed), "notch-sm", className)}
      {...props}
    />
  )
}

/**
 * Groupe d'options à choix unique — un groupe radio : une option allumée, et
 * une seule. Radix laisse décocher l'option active et rend alors `""` : on
 * l'ignore.
 *
 * Sur les primitives de Radix, et non le `ToggleGroup` du registry : son aplat
 * `accent` à l'état actif, sa bordure gauche retirée et ses coins étaient
 * tous à neutraliser. Chaque option garde ses quatre bordures et chevauche la
 * précédente d'un pixel ; l'option allumée, et celle qui a le focus, passent
 * au-dessus, sans quoi leur filet n'aurait que trois côtés. L'encoche va à la
 * dernière, qui porte le coin du groupe.
 */
export function ChoiceGroup<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  /** Nom du groupe, pour les lecteurs d'écran. */
  label: string
  choices: readonly { value: T; label: string }[]
  value: T
  onChange: (next: T) => void
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(next) => next && onChange(next as T)}
      className="flex w-fit items-center"
    >
      {choices.map((choice) => (
        <ToggleGroupPrimitive.Item
          key={choice.value}
          value={choice.value}
          className={cn(
            CONTROL,
            lamp(choice.value === value),
            "last:notch-sm not-first:-ml-px focus-visible:z-10",
            choice.value === value && "z-10"
          )}
        >
          {choice.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}

/**
 * Champ de recherche : loupe et saisie dans un `InputGroup`, qui porte bordure
 * et encoche — un `<input>` n'a pas de `::before` pour en redessiner le biais.
 * `className` va au groupe (largeur, hauteur), le reste à la saisie. Sans
 * aplat en sombre, comme les filtres qu'il côtoie. Geist Mono comme eux, mais
 * sans capitales : ce qu'on tape se relit tel quel.
 */
export function SearchField({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <InputGroup className={cn("notch-sm h-10 dark:bg-transparent", className)}>
      <InputGroupInput className="h-full font-mono md:text-xs" {...props} />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
    </InputGroup>
  )
}
