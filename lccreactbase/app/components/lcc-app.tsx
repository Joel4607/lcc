import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import type { Session } from "@supabase/supabase-js"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Analytics01Icon,
  Building01Icon,
  Calendar03Icon,
  ChartBarLineIcon,
  ChurchIcon,
  Database01Icon,
  DollarCircleIcon,
  FileChartPieIcon,
  Home01Icon,
  Logout01Icon,
  Menu01Icon,
  Moon02Icon,
  Search01Icon,
  Settings01Icon,
  Sun01Icon,
  UserAccountIcon,
  UserGroupIcon,
  ViewSidebarLeftIcon,
  ViewSidebarRightIcon,
} from "@hugeicons/core-free-icons"

import { DEMO_STORAGE_KEY } from "~/components/login-screen"
import { WorkspaceView } from "~/components/workspace-views"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Avatar, AvatarFallback } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet"
import { Skeleton } from "~/components/ui/skeleton"
import { useLccData } from "~/hooks/use-lcc-data"
import {
  canAccess,
  demoProfile,
  getVisibleNav,
  labelForBranch,
  labelForBuscell,
  labelForEkklesia,
  navItems,
  roleLabels,
  type AppView,
  type Profile,
} from "~/lib/domain"
import { cn } from "~/lib/utils"
import { supabase } from "~/lib/supabase"

const navIcons = {
  dashboard: Home01Icon,
  branches: Building01Icon,
  users: UserAccountIcon,
  ekklesias: ChurchIcon,
  buscells: UserGroupIcon,
  members: UserGroupIcon,
  operations: Settings01Icon,
  attendance: Calendar03Icon,
  finance: DollarCircleIcon,
  "member-lookup": Search01Icon,
  reports: FileChartPieIcon,
  "weekly-records": ChartBarLineIcon,
} satisfies Record<AppView, typeof Home01Icon>

export function AppRoute({ view }: { view: AppView }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)
  const [dark, setDark] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  useEffect(() => {
    const demo = window.localStorage.getItem(DEMO_STORAGE_KEY) === "1"
    setDemoMode(demo)

    if (demo) {
      setProfile(demoProfile)
      setAuthLoading(false)
      return
    }

    let mounted = true

    async function initialize() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      setAuthLoading(false)
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (authLoading || demoMode) return

    if (!session) {
      navigate("/login", { replace: true })
      return
    }

    const userId = session.user.id
    let mounted = true

    async function loadProfile() {
      setProfileError(null)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        setProfileError(error.message)
        setProfile(null)
        return
      }

      if (!data) {
        setProfileError("This auth user does not have a profile row yet.")
        setProfile(null)
        return
      }

      setProfile(data as Profile)
    }

    void loadProfile()

    return () => {
      mounted = false
    }
  }, [authLoading, demoMode, navigate, session])

  const dataState = useLccData(profile, demoMode)

  const currentNavItem = navItems.find((item) => item.view === view)
  const visibleNav = useMemo(() => (profile ? getVisibleNav(profile.role) : []), [profile])

  async function signOut() {
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  if (authLoading) {
    return <LoadingShell />
  }

  if (!profile) {
    return (
      <main className="flex h-dvh items-center justify-center overflow-y-auto p-4">
        <Alert className="max-w-xl">
          <HugeiconsIcon icon={Database01Icon} />
          <AlertTitle>Profile setup needed</AlertTitle>
          <AlertDescription>
            {profileError || "Create a profile row for this Supabase Auth user, then reload."}
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  if (!canAccess(profile.role, view)) {
    const fallback = visibleNav[0]?.path || "/dashboard"
    return (
      <main className="flex h-dvh items-center justify-center overflow-y-auto p-4">
        <Alert className="max-w-xl">
          <AlertTitle>Access restricted</AlertTitle>
          <AlertDescription>
            {roleLabels[profile.role]} cannot open {currentNavItem?.label || "this page"}.
          </AlertDescription>
          <Button asChild className="mt-4">
            <Link to={fallback}>Go to workspace</Link>
          </Button>
        </Alert>
      </main>
    )
  }

  return (
    <main className="h-dvh overflow-hidden bg-background">
      <div
        className={cn(
          "grid h-dvh min-h-0 transition-[grid-template-columns] duration-200 lg:grid-cols-[280px_minmax(0,1fr)]",
          sidebarCollapsed && "lg:grid-cols-[76px_minmax(0,1fr)]"
        )}
      >
        <aside className="hidden h-dvh min-h-0 border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
          <SidebarContent
            activePath={location.pathname}
            collapsed={sidebarCollapsed}
            data={dataState.data}
            nav={visibleNav}
            onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
            profile={profile}
            signOut={signOut}
          />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="lg:hidden" size="icon-sm" variant="ghost">
                    <HugeiconsIcon data-icon="inline-start" icon={Menu01Icon} />
                    <span className="sr-only">Open navigation</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="border-sidebar-border bg-sidebar p-0 text-sidebar-foreground" side="left">
                  <SheetHeader className="sr-only">
                    <SheetTitle>LCC navigation</SheetTitle>
                    <SheetDescription>Role-aware workspace navigation</SheetDescription>
                  </SheetHeader>
                  <SidebarContent
                    activePath={location.pathname}
                    collapsed={false}
                    data={dataState.data}
                    nav={visibleNav}
                    onToggleCollapsed={null}
                    profile={profile}
                    signOut={signOut}
                  />
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">LCC Admin</p>
                <h1 className="truncate text-lg font-semibold">{currentNavItem?.label || "Workspace"}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setDark((value) => !value)} size="icon-sm" variant="ghost">
                <HugeiconsIcon data-icon="inline-start" icon={dark ? Sun01Icon : Moon02Icon} />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Avatar className="size-8">
                <AvatarFallback>{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
            {dataState.error ? (
              <Alert className="mb-4">
                <HugeiconsIcon icon={Analytics01Icon} />
                <AlertTitle>Using demo data</AlertTitle>
                <AlertDescription>{dataState.error}</AlertDescription>
              </Alert>
            ) : null}
            <WorkspaceView dataState={dataState} profile={profile} view={view} />
          </div>
        </section>
      </div>
    </main>
  )
}

function SidebarContent({
  activePath,
  collapsed,
  data,
  nav,
  onToggleCollapsed,
  profile,
  signOut,
}: {
  activePath: string
  collapsed: boolean
  data: ReturnType<typeof useLccData>["data"]
  nav: ReturnType<typeof getVisibleNav>
  onToggleCollapsed: (() => void) | null
  profile: Profile
  signOut: () => void
}) {
  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <div
        className={cn(
          "flex shrink-0 items-center gap-3 px-4 py-4",
          collapsed && "justify-center px-3"
        )}
      >
        <div className="grid size-10 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
          <HugeiconsIcon icon={ChurchIcon} />
        </div>
        <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
          <p className="text-xs font-medium text-sidebar-foreground/60">LCC Admin</p>
          <p className="truncate text-sm font-semibold">Operations Suite</p>
        </div>
        {onToggleCollapsed ? (
          <Button
            className={cn("text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", collapsed && "hidden")}
            onClick={onToggleCollapsed}
            size="icon-sm"
            title="Collapse navigation"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon data-icon="inline-start" icon={ViewSidebarLeftIcon} />
            <span className="sr-only">Collapse navigation</span>
          </Button>
        ) : null}
      </div>
      {collapsed && onToggleCollapsed ? (
        <div className="shrink-0 px-3 pb-2">
          <Button
            className="w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={onToggleCollapsed}
            size="icon-sm"
            title="Expand navigation"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon data-icon="inline-start" icon={ViewSidebarRightIcon} />
            <span className="sr-only">Expand navigation</span>
          </Button>
        </div>
      ) : null}
      <Separator className="bg-sidebar-border" />
      <nav
        className={cn(
          "hide-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-3",
          collapsed && "items-center px-2"
        )}
      >
        {nav.map((item) => {
          const active = activePath === item.path
          const Icon = navIcons[item.view]

          return (
            <Button
              asChild
              className={cn(
                "h-8 justify-start gap-2 rounded-lg px-3 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "size-9 justify-center px-0",
                active && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
              key={item.path}
              title={item.label}
              variant="ghost"
            >
              <Link to={item.path}>
                <HugeiconsIcon data-icon="inline-start" icon={Icon} />
                <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
              </Link>
            </Button>
          )
        })}
      </nav>
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className={cn("rounded-2xl bg-sidebar-accent p-3 text-sidebar-accent-foreground", collapsed && "p-2")}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Avatar className="size-9">
                <AvatarFallback>{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button onClick={signOut} size="icon-sm" title="Sign out" type="button" variant="secondary">
                <HugeiconsIcon data-icon="inline-start" icon={Logout01Icon} />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          ) : (
            <>
              <p className="truncate text-sm font-semibold">{profile.name}</p>
              <p className="text-xs text-sidebar-foreground/65">{roleLabels[profile.role]}</p>
              <p className="mt-2 text-xs text-sidebar-foreground/65">{labelForBranch(data, profile.branch_id)}</p>
              <p className="text-xs text-sidebar-foreground/65">{labelForEkklesia(data, profile.ekklesia_id)}</p>
              <p className="text-xs text-sidebar-foreground/65">{labelForBuscell(data, profile.buscell_id)}</p>
              <Button className="mt-3 w-full justify-start" onClick={signOut} size="sm" variant="secondary">
                <HugeiconsIcon data-icon="inline-start" icon={Logout01Icon} />
                Sign out
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingShell() {
  return (
    <main className="grid h-dvh overflow-hidden lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r bg-sidebar p-4 lg:block">
        <Skeleton className="mb-6 h-10 w-40" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton className="h-10 rounded-xl" key={index} />
          ))}
        </div>
      </aside>
      <section className="p-6">
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-28 rounded-2xl" key={index} />
          ))}
        </div>
      </section>
    </main>
  )
}
