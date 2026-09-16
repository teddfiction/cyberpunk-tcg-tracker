/** Navigation latérale : vues, import de fichiers, bascule de thème. */
import {
  Library,
  Microchip,
  Moon,
  RefreshCw,
  Settings2,
  Sun,
  Table2,
  Upload,
  type LucideIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { VIEWS, VIEW_IDS, type View } from "@/lib/views"

/** L'icône de chaque vue. `Record<View, …>` : en ajouter une sans icône ne compile pas. */
const ICONS: Record<View, LucideIcon> = {
  table: Table2,
  netdeck: Library,
  settings: Settings2,
}

/**
 * États des entrées de menu. Le registry colore le fond au survol et à
 * l'activation ; ici c'est le texte qui parle, jamais le fond — sur la barre
 * noire, un aplat gris était la seule chose qui ressortait.
 *
 *   repos   un cran sous le blanc
 *   survol  blanc plein
 *   actif   jaune, et le reste au survol — `--sidebar-active`, pas l'accent :
 *           en texte sur la barre claire, celui-ci serait illisible
 *
 * Passé en `className` : `SidebarMenuButton` le fusionne par `cn` après ses
 * propres variantes, donc ces classes l'emportent à préfixe égal sans qu'on
 * touche au fichier du registry.
 */
const ITEM = cn(
  "text-sidebar-foreground/70",
  "hover:bg-transparent hover:text-sidebar-foreground",
  "active:bg-transparent active:text-sidebar-foreground",
  "data-[active=true]:bg-transparent data-[active=true]:text-sidebar-active",
  "data-[active=true]:hover:text-sidebar-active"
)

type Props = {
  view: View
  onView: (v: View) => void
  onImport: () => void
  /** Télécharge les trois exports Cardmarket du jour. */
  onRefresh: () => void
  /** Téléchargement en cours : l'icône tourne et le bouton ne se reclique pas. */
  fetching: boolean
  dark: boolean
  onToggleTheme: () => void
}

export function AppSidebar({
  view,
  onView,
  onImport,
  onRefresh,
  fetching,
  dark,
  onToggleTheme,
}: Props) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => onView("table")}
              tooltip="Cyberpunk Tracker"
              className="hover:bg-transparent active:bg-transparent"
            >
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center">
                <Microchip className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Cyberpunk Tracker</span>
                <span className="text-muted-foreground truncate text-xs">Trading Card Game</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {VIEW_IDS.map((id) => {
                const Icon = ICONS[id]
                return (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      isActive={view === id}
                      onClick={() => onView(id)}
                      tooltip={VIEWS[id].label}
                      className={ITEM}
                    >
                      <Icon />
                      <span>{VIEWS[id].label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Données</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onImport} tooltip="Importer un JSON" className={ITEM}>
                  <Upload />
                  <span>Importer un JSON</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onRefresh}
                  disabled={fetching}
                  tooltip="Actualiser les données"
                  className={ITEM}
                >
                  <RefreshCw className={fetching ? "animate-spin" : undefined} />
                  <span>{fetching ? "Téléchargement…" : "Actualiser les données"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onToggleTheme}
              tooltip={dark ? "Thème clair" : "Thème sombre"}
              className={ITEM}
            >
              {dark ? <Sun /> : <Moon />}
              <span>{dark ? "Thème clair" : "Thème sombre"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
