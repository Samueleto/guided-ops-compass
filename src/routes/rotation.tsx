import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, Clock, Hourglass, Link2, Loader2, Pause, Play, Plus, RefreshCcw, Repeat, Search, ShoppingCart, Trash2, Wand2, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stepper, StepCard } from "@/components/app/wizard";
import { JobTracker } from "@/components/app/job-tracker";
import { Card, DemoTag, EmptyState, ErrorState, LiveDot, PageHeader, Skel } from "@/components/app/ui";
import { api } from "@/lib/api";
import { useAllDomains, useJob, useKuma, useRotationHistory, useSchedules } from "@/lib/queries";
import { clearState, loadState, saveState, useMode } from "@/lib/mode";
import { WEEKDAYS, describeSchedule, isRotatable, landingUrl, nextRuns, pickNextDomain, domainNumber } from "@/lib/rules";
import type { ScheduleInput } from "@/lib/api/types";
import { dateTime, until } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rotation")({
  validateSearch: (s: Record<string, unknown>): { domain?: string } => (typeof s["domain"] === "string" ? { domain: s["domain"] } : {}),
  head: () => ({
    meta: [
      { title: "Rotation — Domain Manager AI" },
      { name: "description", content: "Rotate your Simple Kuma ADP landing once or on an automatic schedule." },
      { property: "og:title", content: "Rotation — Domain Manager AI" },
      { property: "og:description", content: "Rotate your Simple Kuma ADP landing once or on an automatic schedule." },
    ],
  }),
  component: RotationPage,
});

type Freq = "30" | "60" | "120" | "custom" | "daily" | "weekly";
interface RState {
  step: number;
  domain: string; // "auto" or a domain name
  mode: "once" | "auto";
  freq: Freq;
  customMinutes: number;
  time: string;
  weekday: number;
  timezone: string;
  jobId?: string;
  scheduleId?: string;
}
const INIT: RState = { step: 0, domain: "auto", mode: "once", freq: "60", customMinutes: 45, time: "09:00", weekday: 1, timezone: "Africa/Lagos" };
const STEPS = ["Choose domain", "Verify Kuma", "Schedule", "Review & run"];
const TIMEZONES = ["Africa/Lagos", "UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney"];

function toSchedule(s: RState, firstDomain?: string): ScheduleInput {
  const base = { timezone: s.timezone, ...(firstDomain ? { firstDomain } : {}) };
  if (s.freq === "daily") return { mode: "daily", time: s.time, ...base };
  if (s.freq === "weekly") return { mode: "weekly", time: s.time, weekday: s.weekday, ...base };
  return { mode: "interval", intervalMinutes: s.freq === "custom" ? Math.max(5, s.customMinutes) : Number(s.freq), ...base };
}

function RotationPage() {
  const mode = useMode();
  const search = Route.useSearch();
  const [st, setSt] = useState<RState>(INIT);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = loadState("rotation-wizard", INIT);
    setSt(search.domain && !saved.jobId && !saved.scheduleId ? { ...saved, step: 0, domain: search.domain } : saved);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  useEffect(() => {
    if (ready) saveState("rotation-wizard", st);
  }, [st, ready]);
  const set = (p: Partial<RState>) => setSt((s) => ({ ...s, ...p }));
  const reset = () => {
    clearState("rotation-wizard");
    setSt(INIT);
  };

  const domains = useAllDomains();
  const pool = useMemo(() => (domains.data ?? []).filter(isRotatable).sort((a, b) => domainNumber(a.name) - domainNumber(b.name)), [domains.data]);
  const target = st.domain === "auto" ? pickNextDomain(domains.data ?? []) : pool.find((d) => d.name === st.domain);

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader eyebrow="Guided wizard" title="Domain rotation" description="Point your Simple Kuma ADP landing at a fresh READY domain — once, or automatically." />
        {!ready ? (
          <Skel className="h-96" />
        ) : (
          <>
            <Stepper steps={STEPS} current={st.step} />
            {st.step === 0 && <StepChoose st={st} set={set} pool={pool} loading={!domains.data} />}
            {st.step === 1 && <StepKuma target={target?.name} onBack={() => set({ step: 0 })} onNext={() => set({ step: 2 })} />}
            {st.step === 2 && <StepSchedule st={st} set={set} />}
            {st.step === 3 && <StepReview st={st} set={set} target={target?.name} reset={reset} />}
          </>
        )}
      </div>
      <SchedulesAndHistory />
    </div>
  );
}

function StepChoose({ st, set, pool, loading }: { st: RState; set: (p: Partial<RState>) => void; pool: { name: string }[]; loading: boolean }) {
  const [q, setQ] = useState("");
  const list = pool.filter((d) => d.name.includes(q.toLowerCase()));
  const valid = st.domain === "auto" ? pool.length > 0 : pool.some((d) => d.name === st.domain);
  return (
    <StepCard
      stepKey="choose"
      title="Which domain should go live first?"
      description="Only READY domains that have never been used can be selected."
      footer={
        <>
          <span className="text-xs text-muted-foreground">{pool.length === 0 && !loading ? "No READY domains — buy more to rotate." : ""}</span>
          <Button variant="premium" disabled={!valid} onClick={() => set({ step: 1 })}>Continue <ArrowRight /></Button>
        </>
      }
    >
      <div className="mb-5 flex items-center gap-4 rounded-xl border bg-elevated/40 p-4">
        <div className="grid size-14 place-items-center rounded-xl bg-success/12">
          <span className="font-display text-2xl font-semibold text-success">{loading ? "…" : pool.length}</span>
        </div>
        <div className="flex-1">
          <p className="font-medium">READY domains available <DemoTag /></p>
          <p className="text-sm text-muted-foreground">Each one can be used exactly once.</p>
        </div>
        {pool.length === 0 && !loading && <Button variant="outline" size="sm" asChild><Link to="/buy"><ShoppingCart /> Buy domains</Link></Button>}
      </div>
      <button
        onClick={() => set({ domain: "auto" })}
        className={cn("mb-3 flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all", st.domain === "auto" ? "border-primary bg-primary/6 ring-2 ring-primary/20" : "hover:bg-accent/40")}
      >
        <span className="grid size-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground"><Wand2 className="size-4" /></span>
        <div className="flex-1">
          <p className="font-medium">Auto-select next eligible</p>
          <p className="text-xs text-muted-foreground">{pool[0] ? <>Currently <span className="font-mono">{pool[0].name}</span></> : "Lowest-numbered never-used READY domain"}</p>
        </div>
      </button>
      {pool.length > 5 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a domain…" className="pl-9" />
        </div>
      )}
      <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {loading && Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-14" />)}
        {list.map((d) => (
          <button
            key={d.name}
            onClick={() => set({ domain: d.name })}
            className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all", st.domain === d.name ? "border-primary bg-primary/6 ring-2 ring-primary/20" : "hover:bg-accent/40")}
          >
            <span className={cn("size-4 rounded-full border-2", st.domain === d.name ? "border-primary bg-primary" : "border-border")} />
            <span className="flex-1 font-mono text-sm">{d.name}</span>
            <span className="text-[11px] font-semibold text-success">READY</span>
          </button>
        ))}
      </div>
    </StepCard>
  );
}

function StepKuma({ target, onBack, onNext }: { target?: string; onBack: () => void; onNext: () => void }) {
  const kuma = useKuma();
  const k = kuma.data;
  return (
    <StepCard
      stepKey="kuma"
      title="Verify Simple Kuma"
      description="We read your current ADP landing so you can see exactly what will change."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}><ArrowLeft /> Back</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => kuma.refetch()} disabled={kuma.isFetching}>{kuma.isFetching ? <Loader2 className="animate-spin" /> : <RefreshCcw />} Re-check</Button>
            <Button variant="premium" onClick={onNext} disabled={!k?.connected || !target}>Continue <ArrowRight /></Button>
          </div>
        </>
      }
    >
      {kuma.error ? (
        <ErrorState error={kuma.error} onRetry={() => kuma.refetch()} />
      ) : !k ? (
        <Skel className="h-56" />
      ) : (
        <div className="space-y-4">
          <div className={cn("flex items-center gap-3 rounded-xl border p-4", k.connected ? "border-success/30 bg-success/6" : "border-destructive/30 bg-destructive/6")}>
            {k.connected ? <LiveDot tone="success" /> : <XCircle className="size-4 text-destructive" />}
            <div className="flex-1">
              <p className="font-medium">{k.connected ? "Connected to Simple Kuma" : "Simple Kuma not reachable"} <DemoTag /></p>
              <p className="text-xs text-muted-foreground">Campaign {k.campaign ?? "—"} · checked {dateTime(k.checkedAt)}</p>
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-xs font-semibold text-muted-foreground">Current landing</p>
            <p className="mt-1 break-all font-mono text-sm text-muted-foreground line-through decoration-destructive/60">{k.currentUrl ?? "None set"}</p>
            <div className="my-3 flex justify-center"><ArrowDown className="size-4 text-primary" /></div>
            <p className="text-xs font-semibold text-muted-foreground">New landing</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-primary">{target ? landingUrl(target) : "No READY domain available"}</p>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Link2 className="size-3.5" /> Landing path is always <code className="rounded bg-muted px-1 font-mono">/adultp/</code></p>
        </div>
      )}
    </StepCard>
  );
}

function StepSchedule({ st, set }: { st: RState; set: (p: Partial<RState>) => void }) {
  const runs = st.mode === "auto" ? nextRuns(toSchedule(st), new Date(), 3) : [];
  const freqs: { v: Freq; l: string }[] = [
    { v: "30", l: "Every 30 min" }, { v: "60", l: "Every hour" }, { v: "120", l: "Every 2 hours" }, { v: "custom", l: "Custom interval" }, { v: "daily", l: "Daily" }, { v: "weekly", l: "Weekly" },
  ];
  return (
    <StepCard
      stepKey="sched"
      title="How often should it rotate?"
      footer={
        <>
          <Button variant="ghost" onClick={() => set({ step: 1 })}><ArrowLeft /> Back</Button>
          <Button variant="premium" onClick={() => set({ step: 3 })}>Review <ArrowRight /></Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          { v: "once", icon: Zap, t: "Rotate once", d: "Change the landing one time. No schedule is created." },
          { v: "auto", icon: Repeat, t: "Automatic rotation", d: "Keep rotating to the next never-used READY domain." },
        ] as const).map((o) => (
          <button key={o.v} onClick={() => set({ mode: o.v })} className={cn("rounded-xl border p-5 text-left transition-all", st.mode === o.v ? "border-primary bg-primary/6 ring-2 ring-primary/20" : "hover:bg-accent/40")}>
            <o.icon className={cn("mb-3 size-6", st.mode === o.v ? "text-primary" : "text-muted-foreground")} />
            <p className="font-semibold">{o.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{o.d}</p>
          </button>
        ))}
      </div>
      {st.mode === "auto" && (
        <div className="animate-step mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {freqs.map((f) => (
              <button key={f.v} onClick={() => set({ freq: f.v })} className={cn("rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors", st.freq === f.v ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent/40")}>{f.l}</button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {st.freq === "custom" && (
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Every (minutes)</span>
                <Input type="number" min={5} value={st.customMinutes} onChange={(e) => set({ customMinutes: Number(e.target.value) })} />
              </label>
            )}
            {st.freq === "weekly" && (
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Day</span>
                <Select value={String(st.weekday)} onValueChange={(v) => set({ weekday: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{WEEKDAYS.map((w, i) => <SelectItem key={w} value={String(i)}>{w}</SelectItem>)}</SelectContent></Select>
              </label>
            )}
            {(st.freq === "daily" || st.freq === "weekly") && (
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Time</span>
                <Input type="time" value={st.time} onChange={(e) => set({ time: e.target.value })} />
              </label>
            )}
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Timezone</span>
              <Select value={st.timezone} onValueChange={(v) => set({ timezone: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </label>
          </div>
          <div className="rounded-xl border bg-elevated/40 p-4">
            <p className="font-medium">{describeSchedule(toSchedule(st))} <span className="text-muted-foreground">({st.timezone})</span></p>
            <p className="mt-0.5 text-xs text-muted-foreground">The domain you chose goes first, then the next never-used READY domain each time. If none are left, the current landing stays.</p>
            <ul className="mt-3 space-y-1">
              {runs.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm"><Clock className="size-3.5 text-primary" /> {r.toLocaleString(undefined, { timeZone: st.timezone, weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </StepCard>
  );
}

function StepReview({ st, set, target, reset }: { st: RState; set: (p: Partial<RState>) => void; target?: string; reset: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const job = useJob(st.jobId);
  const schedules = useSchedules();
  const sched = schedules.data?.find((s) => s.id === st.scheduleId);
  const started = !!st.jobId || !!st.scheduleId;

  async function run() {
    setBusy(true);
    try {
      if (st.mode === "once") {
        const j = await api.rotateNow(st.domain === "auto" ? undefined : st.domain);
        set({ jobId: j.id });
      } else {
        const s = await api.createSchedule(toSchedule(st, target));
        set({ scheduleId: s.id });
      }
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepCard
      stepKey="review"
      title={started ? (st.mode === "once" ? "Rotation in progress" : "Schedule enabled") : "Review and confirm"}
      footer={
        started ? (
          <>
            <span className="text-xs text-muted-foreground">Progress is saved — you can leave this page.</span>
            <Button variant="outline" onClick={reset}><Plus /> New rotation</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => set({ step: 2 })}><ArrowLeft /> Back</Button>
            <Button variant="premium" onClick={run} disabled={busy || !target}>
              {busy ? <Loader2 className="animate-spin" /> : st.mode === "once" ? <Zap /> : <CalendarClock />} {st.mode === "once" ? "Rotate now" : "Enable schedule"}
            </Button>
          </>
        )
      }
    >
      {!started && (
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-4"><dt className="text-xs text-muted-foreground">Domain</dt><dd className="mt-1 font-mono text-sm font-semibold">{target ?? "None available"}</dd>{st.domain === "auto" && <dd className="text-[11px] text-muted-foreground">Auto-selected</dd>}</div>
          <div className="rounded-xl border p-4"><dt className="text-xs text-muted-foreground">Schedule</dt><dd className="mt-1 text-sm font-semibold">{st.mode === "once" ? "Once, right now" : describeSchedule(toSchedule(st))}</dd></div>
          <div className="rounded-xl border p-4"><dt className="text-xs text-muted-foreground">New Kuma landing</dt><dd className="mt-1 break-all font-mono text-xs font-semibold text-primary">{target ? landingUrl(target) : "—"}</dd></div>
        </dl>
      )}
      {st.jobId && (job.data ? (
        <div className="space-y-4">
          {job.data.state === "completed" && (
            <div className="animate-step flex items-center gap-3 rounded-xl border border-success/30 bg-success/8 p-4">
              <CheckCircle2 className="size-6 text-success" />
              <div><p className="font-semibold">Rotation successful <DemoTag /></p><p className="text-sm text-muted-foreground">Kuma now points to <span className="font-mono">{landingUrl(job.data.items[0]?.domain ?? "")}</span>. The domain is permanently marked used.</p></div>
            </div>
          )}
          <JobTracker job={job.data} title="Kuma ADP landing update" />
        </div>
      ) : job.error ? <ErrorState error={job.error} onRetry={() => job.refetch()} /> : <Skel className="h-72" />)}
      {st.scheduleId && (
        sched ? (
          <div className="space-y-3">
            {sched.state === "waiting_for_domains" ? (
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/8 p-4">
                <Hourglass className="mt-0.5 size-5 text-warning" />
                <div><p className="font-semibold">Waiting for domains</p><p className="text-sm text-muted-foreground">No never-used READY domain was available. The last working landing was kept. Buy more domains and the schedule continues automatically.</p></div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/6 p-4">
                <CalendarClock className="mt-0.5 size-5 text-primary" />
                <div>
                  <p className="font-semibold">Schedule active {sched.runs === 0 && "— waiting for first run"} <DemoTag /></p>
                  <p className="text-sm text-muted-foreground">
                    {sched.runs === 0 ? "No rotation has happened yet. " : `${sched.runs} rotation${sched.runs > 1 ? "s" : ""} completed. `}
                    Next run {until(sched.nextRunAt)} ({dateTime(sched.nextRunAt)}).
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Each executed rotation appears in the history below with its own live progress.</p>
          </div>
        ) : <Skel className="h-24" />
      )}
    </StepCard>
  );
}

function SchedulesAndHistory() {
  const qc = useQueryClient();
  const schedules = useSchedules();
  const runs = useRotationHistory();
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <h3 className="mb-3 font-semibold">Automatic schedules</h3>
        {!schedules.data ? <Skel className="h-24" /> : schedules.data.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No schedules" body="Choose Automatic rotation in the wizard to create one." />
        ) : (
          <ul className="space-y-2">
            {schedules.data.map((s) => (
              <li key={s.id} className="rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <LiveDot tone={s.state === "active" ? "success" : s.state === "waiting_for_domains" ? "warning" : "info"} />
                  <p className="flex-1 text-sm font-medium">{describeSchedule(s)}</p>
                  {s.state === "paused" ? (
                    <Button size="icon" variant="ghost" aria-label="Resume" onClick={() => act(() => api.updateSchedule(s.id, { state: "active" }))}><Play /></Button>
                  ) : (
                    <Button size="icon" variant="ghost" aria-label="Pause" onClick={() => act(() => api.updateSchedule(s.id, { state: "paused" }))}><Pause /></Button>
                  )}
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => act(() => api.deleteSchedule(s.id))}><Trash2 /></Button>
                </div>
                <p className="mt-1 pl-4 text-xs text-muted-foreground">
                  {s.state === "paused" ? "Paused" : s.state === "waiting_for_domains" ? "Waiting for READY domains" : `Next ${until(s.nextRunAt)}`} · {s.runs} run{s.runs === 1 ? "" : "s"} · {s.timezone}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="lg:col-span-3">
        <h3 className="mb-3 font-semibold">Rotation history</h3>
        {!runs.data ? <Skel className="h-40" /> : runs.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rotations yet.</p>
        ) : (
          <ul className="divide-y">
            {runs.data.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                {r.state === "completed" ? <CheckCircle2 className="size-4 text-success" /> : r.state === "no_domains" ? <Hourglass className="size-4 text-warning" /> : r.state === "running" ? <Loader2 className="size-4 animate-spin text-primary" /> : r.state === "attention" ? <Clock className="size-4 text-warning" /> : <XCircle className="size-4 text-destructive" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.state === "no_domains" ? "Skipped — no READY domains, landing kept" : <span className="font-mono">{r.domain}</span>}</p>
                  <p className="text-xs text-muted-foreground">{r.trigger === "schedule" ? "Scheduled" : "Manual"} · {dateTime(r.startedAt)}</p>
                </div>
                <span className="text-xs capitalize text-muted-foreground">{r.state.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
