/**
 * Onglets des niveaux de la collection : un `Item` shadcn par niveau, titre et
 * sous-titre, sur les primitives `Tabs` de Radix.
 *
 * Pas le `TabsTrigger` du registry : ses trente classes — hauteur, `flex-1`,
 * `whitespace-nowrap`, aplats actifs, soulignement `after:` — seraient toutes à
 * neutraliser. Les `asChild` imbriqués gardent la sémantique d'onglet de Radix
 * (flèches, activation au focus, `aria-controls`) sur un seul `<button>`, qui
 * porte les classes de l'`Item`.
 */
import { Tabs as TabsPrimitive } from "radix-ui"

import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item"
import { LEVEL_IDS, LEVELS } from "@/lib/collection"

/**
 * À placer dans le `Tabs` qui porte le niveau choisi.
 *
 * Côte à côte à partir de `lg` seulement : en deçà, la barre latérale ouverte
 * laisserait moins de 160 px à chacun. `text-left` parce qu'un bouton centre
 * son texte. Au repos, un aplat `card` — gris foncé en sombre — : les onglets
 * se lisent comme des commandes, les statistiques en dessous, sur le fond de la
 * page, comme des données. Le survol n'éclaire que les onglets inactifs —
 * l'actif est un aplat jaune, texte noir, le contraste maximal, et doit le
 * rester. Il fonce aussi la bordure : en clair, `accent` n'est qu'à 3 % de
 * `card`.
 */
export function LevelTabs() {
  return (
    <TabsPrimitive.List aria-label="Niveau de la collection" className="grid gap-2 lg:grid-cols-3">
      {LEVEL_IDS.map((id) => (
        <TabsPrimitive.Trigger key={id} value={id} asChild>
          <Item
            asChild
            variant="outline"
            size="sm"
            className="bg-card data-[state=inactive]:hover:border-foreground/40 data-[state=inactive]:hover:bg-accent data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-selected-foreground cursor-pointer text-left"
          >
            <button>
              <ItemContent>
                <ItemTitle>{LEVELS[id].label}</ItemTitle>
                {/* En entier : le registry coupe à deux lignes, et celui du
                    Masterset en prend trois à la largeur d'un onglet. */}
                <ItemDescription className="group-data-[state=active]/item:text-selected-foreground line-clamp-none">
                  {LEVELS[id].hint}
                </ItemDescription>
              </ItemContent>
            </button>
          </Item>
        </TabsPrimitive.Trigger>
      ))}
    </TabsPrimitive.List>
  )
}
