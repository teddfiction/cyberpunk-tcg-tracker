/** Navigation latérale : vues, import de fichiers, bascule de thème. */
import { Library, Microchip, Moon, Settings2, Sun, Table2, Upload, type LucideIcon } from "lucide-react"

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
import { VIEWS, VIEW_IDS, type View } from "@/lib/views"

/** L'icône de chaque vue. `Record<View, …>` : en ajouter une sans icône ne compile pas. */
const ICONS: Record<View, LucideIcon> = {
  table: Table2,
  netdeck: Library,
  settings: Settings2,
}

type Props = {
  view: View
  onView: (v: View) => void
  onImport: () => void
  dark: boolean
  onToggleTheme: () => void
}

export function AppSidebar({ view, onView, onImport, dark, onToggleTheme }: Props) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => onView("table")} tooltip="Cyberpunk Tracker">
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
                <SidebarMenuButton onClick={onImport} tooltip="Importer un JSON">
                  <Upload />
                  <span>Importer un JSON</span>
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
            <SidebarMenuButton onClick={onToggleTheme} tooltip={dark ? "Thème clair" : "Thème sombre"}>
              {dark ? <Sun /> : <Moon />}
              <span>{dark ? "Thème clair" : "Thème sombre"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
