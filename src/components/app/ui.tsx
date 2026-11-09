import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DomainStatus, Integration } from "@/lib/api/types";
import { ApiError } from "@/lib/api";
import { useMode } from "@/lib/mode";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("surface p-5", className)}>{children}</div>;
}

export function LiveDot({ tone = "success", className }: { tone?: "success" | "warning" | "info" | "destructive" | "primary"; className?: string }) {
  const bg = { success: "bg-success", warning: "bg-warning", info: "bg-info", destructive: "bg-destructive", primary: "bg-primary" }[tone];
  return (
    <span className={cn("relative inline-flex size-2", className)}>
      <span className={cn("absolute inset-0 rounded-full animate-live", bg)} />
      <span className={cn("relative inline-flex size-2 rounded-full", bg)} />
    </span>
  );
}

const STATUS: Record<DomainStatus, { label: string; cls: string }> = {
  READY: { label: "Ready", cls: "bg-success/12 text-success ring-success/25" },
  PREPARING: { label: "Preparing", cls: "bg-info/12 text-info ring-info/25" },
  WAITING: { label: "Waiting", cls: "bg-warning/12 text-warning ring-warning/25" },
  ACTION_REQUIRED: { label: "Action required", cls: "bg-destructive/12 text-destructive ring-destructive/25" },
  IN_USE: { label: "In use", cls: "bg-primary/14 text-primary ring-primary/30" },
  USED: { label: "Used", cls: "bg-muted text-muted-foreground ring-border" },
  FAILED: { label: "Failed", cls: "bg-destructive/12 text-destructive ring-destructive/25" },
};
export const STATUS_LIST = Object.keys(STATUS) as DomainStatus[];
export const statusLabel = (s: DomainStatus) => STATUS[s].label;

export function StatusBadge({ status, className }: { status: DomainStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", s.cls, className)}>
      {(status === "PREPARING" || status === "WAITING") && <LiveDot tone={status === "WAITING" ? "warning" : "info"} className="size-1.5" />}
      {s.label}
    </span>
  );
}

export function IntegrationPill({ i }: { i: Integration }) {
  const tone = i.status === "connected" ? "success" : i.status === "degraded" ? "warning" : i.status === "unknown" ? "info" : "destructive";
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-elevated/50 px-3 py-2.5">
      <LiveDot tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{i.name}</p>
        <p className="truncate text-xs text-muted-foreground">{i.message ?? i.status}</p>
      </div>
      {i.latencyMs != null && <span className="font-mono text-[11px] text-muted-foreground">{i.latencyMs}ms</span>}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, body, action }: { icon?: typeof Inbox; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <p className="font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = error instanceof ApiError ? error.error : null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/6 p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="font-medium">{e?.message ?? (error instanceof Error ? error.message : "Something went wrong")}</p>
        {e?.explanation && <p className="mt-1 text-sm text-muted-foreground">{e.explanation}</p>}
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw /> Retry
        </Button>
      )}
    </div>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg bg-muted", className)} />;
}

export function DemoTag({ className }: { className?: string }) {
  const mode = useMode();
  if (mode !== "demo") return null;
  return (
    <span className={cn("inline-flex items-center rounded-md border border-warning/40 bg-warning/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-warning", className)}>
      Demo
    </span>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "primary" }: { label: string; value: ReactNode; hint?: ReactNode; icon: typeof Inbox; tone?: "primary" | "success" | "warning" | "info" | "muted" }) {
  const t = { primary: "bg-primary/12 text-primary", success: "bg-success/12 text-success", warning: "bg-warning/12 text-warning", info: "bg-info/12 text-info", muted: "bg-muted text-muted-foreground" }[tone];
  return (
    <div className="surface group p-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg", t)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
