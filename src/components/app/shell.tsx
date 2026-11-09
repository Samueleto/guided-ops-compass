import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Globe2,
  LayoutDashboard,
  Menu,
  Moon,
  RefreshCcw,
  Settings,
  ShoppingCart,
  Sparkles,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { setMode, useMode } from "@/lib/mode";
import { useOverview } from "@/lib/queries";
import { LiveDot } from "./ui";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/buy", label: "Buy & Prepare", icon: ShoppingCart },
  { to: "/domains", label: "Domains", icon: Globe2 },
  { to: "/rotation", label: "Rotation", icon: RefreshCcw },
  { to: "/ai", label: "AI Operations", icon: Bot },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
        <Sparkles className="size-4 text-primary-foreground" />
      </span>
      {!compact && (
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Domain Manager <span className="text-gradient">AI</span>
        </span>
      )}
    </Link>
  );
}

function NavList({ onNavigate, compact }: { onNavigate?: () => void; compact?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            title={n.label}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              compact && "justify-center px-0",
            )}
          >
            {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-gradient-primary" />}
            <n.icon className={cn("size-[18px]", active && "text-primary")} />
            {!compact && n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AiStatusChip() {
  const { data } = useOverview();
  const st = data?.ai.state ?? "idle";
  const label = { monitoring: "AI monitoring", investigating: "AI investigating", assisting: "AI assisting", idle: "AI idle", offline: "AI offline" }[st];
  const tone = st === "investigating" ? "warning" : st === "assisting" ? "info" : st === "offline" ? "destructive" : "success";
  return (
    <Link to="/ai" className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent md:flex">
      <LiveDot tone={tone} /> {label}
    </Link>
  );
}

function ModeSwitch() {
  const mode = useMode();
  const qc = useQueryClient();
  return (
    <button
      onClick={() => {
        setMode(mode === "demo" ? "live" : "demo");
        qc.clear();
      }}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        mode === "demo" ? "border-warning/40 bg-warning/10 text-warning" : "border-success/40 bg-success/10 text-success",
      )}
      title="Switch between Demo and Live mode"
    >
      {mode === "demo" ? "Demo mode" : "Live"}
    </button>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("dm-theme", next ? "dark" : "light");
      }}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const mode = useMode();
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col border-r bg-sidebar px-2 py-4 md:flex lg:w-60 lg:px-3">
        <div className="mb-6 px-1 lg:px-2">
          <span className="lg:hidden"><Logo compact /></span>
          <span className="hidden lg:block"><Logo /></span>
        </div>
        <div className="lg:hidden"><NavList compact /></div>
        <div className="hidden lg:block"><NavList /></div>
        <div className="mt-auto hidden rounded-xl border bg-card/60 p-3 lg:block">
          <p className="text-xs font-semibold">{mode === "demo" ? "Demo data" : "Connected to your server"}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {mode === "demo" ? "Nothing here is a real purchase or rotation." : "Showing live results from your backend."}
          </p>
        </div>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="mb-6"><Logo /></div>
          <NavList onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="md:pl-16 lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <span className="md:hidden"><Logo compact /></span>
          <div className="ml-auto flex items-center gap-2">
            <AiStatusChip />
            <ModeSwitch />
            <ThemeToggle />
            <Button variant="premium" size="sm" asChild>
              <Link to="/ai">
                <Sparkles /> <span className="hidden sm:inline">Ask AI</span>
              </Link>
            </Button>
          </div>
        </header>
        {mode === "demo" && (
          <div className="border-b border-warning/20 bg-warning/8 px-4 py-1.5 text-center text-xs text-warning sm:px-6">
            Demo mode — simulated data. No real domains are bought, configured or rotated.
          </div>
        )}
        <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:pt-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 bg-hero" />
          <div className="relative">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/90 backdrop-blur-xl md:hidden">
        {NAV.slice(0, 5).map((n) => (
          <MobileTab key={n.to} to={n.to} label={n.label.split(" ")[0] ?? n.label} icon={n.icon} />
        ))}
      </nav>
    </div>
  );
}

function MobileTab({ to, label, icon: Icon }: { to: (typeof NAV)[number]["to"]; label: string; icon: typeof Bot }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/" ? path === "/" : path.startsWith(to);
  return (
    <Link to={to} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
