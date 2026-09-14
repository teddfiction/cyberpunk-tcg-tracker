/** Navigation latérale : vues, import de fichiers, bascule de thème. */
import { Moon, Settings2, Sun, Table2, Upload } from "lucide-react"

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

export type View = "table" | "settings"

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
            <SidebarMenuButton size="lg" onClick={() => onView("table")} tooltip="Data table">
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center">
                <Table2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Cyberpunk TCG</span>
                <span className="text-muted-foreground truncate text-xs">Cotes Cardmarket</span>
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "table"}
                  onClick={() => onView("table")}
                  tooltip="Data table"
                >
                  <Table2 />
                  <span>Data table</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "settings"}
                  onClick={() => onView("settings")}
                  tooltip="Paramètres"
                >
                  <Settings2 />
                  <span>Paramètres</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
