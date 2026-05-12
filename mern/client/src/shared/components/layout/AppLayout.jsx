import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../features/auth/context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getBranchLabel, getEcclesiaLabel } from "../../lib/data";
import { getNavItems } from "../../constants/roles";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import {
  LogOut,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Search,
  ChevronRight,
} from "lucide-react";

export default function AppLayout() {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigationItems = getNavItems(user.role);
  const currentItem =
    navigationItems.find((item) => location.pathname.startsWith(item.path)) || navigationItems[0];
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <main className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          sidebarCollapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground shadow-sm">
            L
          </div>
          {!sidebarCollapsed && (
            <div className="animate-fade-in overflow-hidden">
              <p className="font-display text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                LCC Admin
              </p>
              <p className="text-sm font-semibold text-sidebar-foreground">Operations Suite</p>
            </div>
          )}
        </div>

        <Separator />

        {!sidebarCollapsed && (
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 pl-8 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
                placeholder="Search pages..."
                type="text"
              />
            </div>
          </div>
        )}

        <nav className="mt-2 flex-1 space-y-0.5 overflow-auto px-2 py-1">
          {navigationItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
              key={item.path}
              to={item.path}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className={cn("truncate", sidebarCollapsed && "sr-only")}>{item.label}</span>
              {sidebarCollapsed && (
                <span className="text-xs font-bold">{item.label.charAt(0)}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-sidebar-border p-3">
          <div className={cn("rounded-lg bg-accent/50 p-3", sidebarCollapsed && "p-2")}>
            {!sidebarCollapsed ? (
              <>
                <p className="text-sm font-semibold text-foreground">{user.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{user.role}</p>
                <p className="text-[11px] text-muted-foreground">{getBranchLabel(user.branch)}</p>
                {user.ecclesia?.name ? (
                  <p className="text-[11px] text-muted-foreground">
                    {getEcclesiaLabel(user.ecclesia)}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex justify-center">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {user.name?.charAt(0) || "U"}
                </div>
              </div>
            )}

            {!sidebarCollapsed && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-xs"
                onClick={logout}
              >
                <LogOut className="mr-1.5 h-3 w-3" />
                Sign out
              </Button>
            )}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-5 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>Dashboard</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">{currentItem?.label || "Overview"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleTheme}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>
      </section>
    </main>
  );
}
