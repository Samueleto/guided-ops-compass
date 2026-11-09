import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity as ActivityIcon, ArrowRight, Bot, CheckCircle2, Clock, Globe2, History, Loader2, RefreshCcw, ShieldCheck, ShoppingCart, Sparkles, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, DemoTag, ErrorState, IntegrationPill, LiveDot, PageHeader, Skel, StatCard } from "@/components/app/ui";
import { jobProgress } from "@/components/app/job-tracker";
import { ActivityRow } from "@/components/app/activity-row";
import { useActivity, useOverview } from "@/lib/queries";
import { money, until } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Domain Manager AI" },
      { name: "description", content: "Overview of your domains, READY pool, rotations, integrations and AI operations." },
      { property: "og:title", content: "Dashboard — Domain Manager AI" },
      { property: "og:description", content: "Overview of your domains, READY pool, rotations, integrations and AI operations." },
    ],
  }),
  component: Dashboard,
});

function AiPanel() {
  const { data } = useOverview();
  const st = data?.ai.state ?? "idle";
  const label = { monitoring: "Monitoring your system", investigating: "Investigating an issue", assisting: "Assisting with operations", idle: "Idle", offline: "Offline" }[st];
  return (
    <div className="surface relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-gradient-primary opacity-20 blur-3xl animate-orb" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
          <Bot className="size-7 text-primary-foreground" />
          <span className="absolute -bottom-1 -right-1 rounded-full bg-card p-1">
            <LiveDot tone={st === "investigating" ? "warning" : st === "assisting" ? "info" : "success"} />
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">AI Operations</p>
            <DemoTag />
          </div>
          <h2 className="mt-1 text-xl font-semibold">{label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{data?.ai.focus ?? "Waiting for status…"}</p>
        </div>
        <Button variant="premium" asChild>
          <Link to="/ai">
            <Sparkles /> Ask AI
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Dashboard() {
  useNow(1000);
  const { data, isLoading, error, refetch } = useOverview();
  const { data: activity } = useActivity({});
  const recoveries = (activity ?? []).filter((a) => a.type === "recovery").slice(0, 3);

  return (
    <div>
      <PageHeader
        eyebrow="Control center"
        title="Good to see you"
        description="Everything about your domains, rotations and automations in one place."
        actions={
          <>
            <Button variant="outline" asChild><Link to="/activity"><History /> View Activity</Link></Button>
            <Button variant="outline" asChild><Link to="/rotation"><RefreshCcw /> Rotate Domain</Link></Button>
            <Button variant="premium" asChild><Link to="/buy"><ShoppingCart /> Buy Domains</Link></Button>
          </>
        }
      />
      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      <div className="space-y-6">
        <AiPanel />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {isLoading || !data ? (
            Array.from({ length: 8 }).map((_, i) => <Skel key={i} className="h-28" />)
          ) : (
            <>
              <StatCard label="READY domains" value={data.counts.READY} hint="Available for rotation" icon={CheckCircle2} tone="success" />
              <StatCard label="Active domain" value={<span className="font-mono text-base">{data.activeDomain ?? "None"}</span>} hint={data.activeUrl} icon={Zap} tone="primary" />
              <StatCard label="Next rotation" value={<span className="text-lg">{data.nextRotationAt ? until(data.nextRotationAt) : "Not scheduled"}</span>} hint={data.nextRotationAt ? new Date(data.nextRotationAt).toLocaleString() : "Set one up in Rotation"} icon={Clock} tone="info" />
              <StatCard label="Namecheap balance" value={money(data.balance, data.currency)} hint="Up to $2.00 per domain" icon={Wallet} tone="warning" />
              <StatCard label="Total domains" value={data.total} icon={Globe2} tone="muted" />
              <StatCard label="Being prepared" value={data.counts.PREPARING + data.counts.WAITING} hint={`${data.counts.ACTION_REQUIRED} need attention`} icon={Loader2} tone="info" />
              <StatCard label="Previously used" value={data.counts.USED} hint="Never reused" icon={History} tone="muted" />
              <StatCard label="Failed" value={data.counts.FAILED} icon={ShieldCheck} tone={data.counts.FAILED ? "warning" : "muted"} />
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Running automation</h3>
              <Link to="/buy" className="text-xs font-medium text-primary hover:underline">Open wizard</Link>
            </div>
            {!data?.runningJobs.length ? (
              <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No background jobs right now.</p>
            ) : (
              <ul className="space-y-3">
                {data.runningJobs.map((j) => {
                  const item = j.items[Math.min(j.currentIndex, j.items.length - 1)];
                  const stage = item?.stages.find((s) => s.status === "running" || s.status === "waiting" || s.status === "attention");
                  const p = jobProgress(j);
                  return (
                    <li key={j.id} className="rounded-lg border bg-elevated/40 p-3">
                      <div className="flex items-center gap-3">
                        <LiveDot tone={j.state === "attention" ? "warning" : "primary"} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {j.type === "purchase" ? "Buy & prepare" : "Rotation"} · <span className="font-mono">{item?.domain}</span>
                            {j.items.length > 1 && <span className="text-muted-foreground"> ({j.currentIndex + 1}/{j.items.length})</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{j.state === "attention" ? "Needs attention: " : ""}{stage?.label}</p>
                        </div>
                        <span className="font-mono text-xs">{Math.round(p * 100)}%</span>
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={j.type === "purchase" ? "/buy" : "/rotation"}><ArrowRight /></Link>
                        </Button>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full transition-all duration-700", j.state === "attention" ? "bg-warning" : "bg-gradient-primary")} style={{ width: `${p * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Integrations</h3>
              <DemoTag />
            </div>
            <div className="space-y-2">
              {data ? data.integrations.map((i) => <IntegrationPill key={i.id} i={i} />) : Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-14" />)}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Recent activity</h3>
              <Link to="/activity" className="text-xs font-medium text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y">
              {(activity ?? []).slice(0, 6).map((a) => <ActivityRow key={a.id} a={a} compact />)}
              {!activity && Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="my-2 h-12" />)}
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 font-semibold">Error recovery</h3>
            {recoveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recoveries yet.</p>
            ) : (
              <ul className="space-y-3">
                {recoveries.map((r) => (
                  <li key={r.id} className="flex gap-3">
                    <span className={cn("mt-1 grid size-6 shrink-0 place-items-center rounded-full", r.status === "success" ? "bg-success/15 text-success" : "bg-info/15 text-info")}>
                      <ActivityIcon className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link to="/ai"><Bot /> Ask AI to check everything</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
