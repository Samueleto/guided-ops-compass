import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Clock, Loader2, MinusCircle, RotateCcw, ShieldQuestion, SkipForward, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Job, Stage } from "@/lib/api/types";
import { api } from "@/lib/api";
import { elapsed } from "@/lib/format";
import { useNow } from "@/hooks/use-now";

export function ProgressRing({ value, size = 64 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={6}
          strokeLinecap="round"
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-xs font-semibold">{Math.round(value * 100)}%</span>
    </div>
  );
}

function StageIcon({ s }: { s: Stage["status"] }) {
  const base = "grid size-7 shrink-0 place-items-center rounded-full";
  if (s === "done")
    return (
      <span className={cn(base, "bg-success text-primary-foreground")}>
        <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[3]">
          <path d="M5 12.5l4.5 4.5L19 7.5" className="check-draw" />
        </svg>
      </span>
    );
  if (s === "running")
    return (
      <span className={cn(base, "bg-primary/15 text-primary ring-4 ring-primary/10")}>
        <Loader2 className="size-4 animate-spin" />
      </span>
    );
  if (s === "waiting")
    return (
      <span className={cn(base, "bg-warning/15 text-warning ring-4 ring-warning/10")}>
        <Clock className="size-4 animate-pulse" />
      </span>
    );
  if (s === "attention")
    return (
      <span className={cn(base, "bg-warning text-primary-foreground")}>
        <AlertTriangle className="size-3.5" />
      </span>
    );
  if (s === "failed")
    return (
      <span className={cn(base, "bg-destructive text-destructive-foreground")}>
        <X className="size-4" />
      </span>
    );
  if (s === "skipped")
    return (
      <span className={cn(base, "bg-muted text-muted-foreground")}>
        <MinusCircle className="size-4" />
      </span>
    );
  return <span className={cn(base, "border-2 border-dashed border-border")} />;
}

export function StageList({ stages }: { stages: Stage[] }) {
  useNow(1000);
  return (
    <ol className="relative">
      {stages.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
          {i < stages.length - 1 && <span className={cn("absolute left-3.5 top-8 bottom-0 w-px", s.status === "done" ? "bg-success/50" : "bg-border")} />}
          <StageIcon s={s.status} />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center justify-between gap-3">
              <p className={cn("text-sm font-medium", s.status === "pending" && "text-muted-foreground")}>{s.label}</p>
              {(s.status === "running" || s.status === "waiting" || s.status === "done") && s.startedAt && (
                <span className="font-mono text-[11px] text-muted-foreground">{elapsed(s.startedAt, s.finishedAt)}</span>
              )}
            </div>
            {s.message && !s.error && <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.message}</p>}
            {s.error && (
              <div className="mt-2 rounded-lg border border-warning/30 bg-warning/8 p-3">
                <p className="text-sm font-medium">{s.error.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.error.explanation}</p>
                <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">{s.error.code}</p>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function jobProgress(job: Job) {
  const all = job.items.flatMap((i) => i.stages);
  const done = all.filter((s) => s.status === "done" || s.status === "skipped").length;
  return all.length ? done / all.length : 0;
}

/** Live view of a backend job. Only renders state reported by the job — never invents progress. */
export function JobTracker({ job, title }: { job: Job; title?: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const idx = Math.min(job.currentIndex, job.items.length - 1);
  const item = job.items[idx];
  const stuck = item?.stages.find((s) => s.status === "attention" || s.status === "failed");
  const total = job.items.length;

  async function act(kind: "retry" | "verify" | "skip") {
    setBusy(kind);
    try {
      if (kind === "retry") await api.retryStage(job.id);
      if (kind === "verify") await api.verifyRegistration(job.id);
      if (kind === "skip") await api.skipItem(job.id);
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div className="rounded-xl border bg-elevated/30 p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {total > 1 && (
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Domain {idx + 1} of {total}
              </p>
            )}
            <p className="truncate font-mono text-lg font-semibold">{item?.domain}</p>
            {title && <p className="text-xs text-muted-foreground">{title}</p>}
          </div>
          <ProgressRing value={jobProgress(job)} />
        </div>
        {item && <StageList stages={item.stages} />}
        {stuck && job.state === "attention" && (
          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
            {stuck.error?.uncertain ? (
              <Button variant="premium" size="sm" disabled={!!busy} onClick={() => act("verify")}>
                {busy === "verify" ? <Loader2 className="animate-spin" /> : <ShieldQuestion />} Verify with registrar
              </Button>
            ) : stuck.error?.retrySafe ? (
              <Button variant="premium" size="sm" disabled={!!busy} onClick={() => act("retry")}>
                {busy === "retry" ? <Loader2 className="animate-spin" /> : <RotateCcw />} Retry this step
              </Button>
            ) : null}
            {job.type === "purchase" && !stuck.error?.uncertain && (
              <Button variant="outline" size="sm" disabled={!!busy} onClick={() => act("skip")}>
                <SkipForward /> Skip domain
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/ai" search={{ q: `Why did ${stuck.label.toLowerCase()} fail for ${item?.domain}?` }}>
                <Sparkles /> Ask AI
              </Link>
            </Button>
            {stuck.error?.uncertain && <p className="w-full text-xs text-muted-foreground">Retrying is disabled until the registrar confirms the outcome, so you're never charged twice.</p>}
          </div>
        )}
      </div>
      {total > 1 && (
        <div className="rounded-xl border p-3">
          <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">Batch</p>
          <ul className="space-y-1">
            {job.items.map((it, i) => (
              <li key={it.domain} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm", i === idx && job.state !== "completed" && "bg-accent")}>
                <StageIcon s={it.status === "done" ? "done" : it.status === "running" ? "running" : it.status === "attention" ? "attention" : it.status === "skipped" ? "skipped" : it.status === "failed" ? "failed" : "pending"} />
                <span className="truncate font-mono text-xs">{it.domain}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export { Check };
