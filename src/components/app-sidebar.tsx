import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Factory, Package, ShieldCheck, Wrench, ShoppingCart,
  AlertTriangle, Users, BarChart3, Tv,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: null },
  { title: "Production", url: "/production", icon: Factory, roles: ["admin", "production"] },
  { title: "Inventory", url: "/inventory", icon: Package, roles: ["admin", "inventory"] },
  { title: "Quality Control", url: "/qc", icon: ShieldCheck, roles: ["admin", "qc"] },
  { title: "Faults & Rework", url: "/faults", icon: Wrench, roles: ["admin", "qc"] },
  { title: "Sales", url: "/sales", icon: ShoppingCart, roles: ["admin", "sales"] },
  { title: "Reorder Alerts", url: "/reorder", icon: AlertTriangle, roles: null },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: null },
  { title: "Users & Roles", url: "/users", icon: Users, roles: ["admin"] },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { hasAny, user, signOut, roles } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Tv className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-wide">KANTANKA ELECTRONICS</span>
              <span className="text-[10px] uppercase text-muted-foreground">TV Line ERP</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const allowed = !it.roles || hasAny([...it.roles] as AppRoleArr);
                if (!allowed) return null;
                const active = path === it.url;
                return (
                  <SidebarMenuItem key={it.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.url} className="flex items-center gap-2">
                        <it.icon className="h-4 w-4" />
                        {!collapsed && <span>{it.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="px-2 py-2 text-xs">
            <div className="truncate font-medium">{user.email}</div>
            <div className="text-muted-foreground capitalize">{roles.join(", ") || "no role"}</div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
          {collapsed ? "⏻" : "Sign out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

type AppRoleArr = ("admin"|"production"|"qc"|"inventory"|"sales")[];
