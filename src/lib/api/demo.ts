// DEMO ADAPTER — simulated data for exploring the interface without a backend.
// Nothing here talks to Namecheap, Cloudflare, Simple Kuma or OpenRouter.
import type { Api } from "./index";
import type {
  Activity,
  AiBlock,
  AiConversation,
  AiEvent,
  AiMessage,
  Domain,
  DomainStatus,
  Integration,
  Job,
  JobItem,
  KumaStatus,
  OpError,
  RotationRun,
  Schedule,
  Settings,
  Stage,
} from "./types";
import { MAX_PRICE, exclusionReason, landingUrl, nextRuns, pickNextDomain, sequentialNames } from "../rules";

const KEY = "dm-demo-store-v1";
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const latency = () => wait(180 + Math.random() * 220);

export const PURCHASE_STAGES: [string, string, number][] = [
  ["purchase", "Purchasing domain through Namecheap", 2600],
  ["zone", "Creating Cloudflare zone", 2000],
  ["nameservers", "Configuring nameservers", 1600],
  ["activation", "Waiting for Cloudflare activation", 4200],
  ["ssl", "Configuring SSL and settings", 1800],
  ["worker", "Attaching Cloudflare Worker", 1800],
  ["landing", "Checking landing URL", 1500],
  ["ready", "Marking domain READY", 800],
];
export const ROTATION_STAGES: [string, string, number][] = [
  ["check", "Checking READY domain", 1100],
  ["connect", "Connecting to Simple Kuma", 1300],
  ["update", "Updating ADP landing", 1600],
  ["readback", "Reading back the saved URL", 1200],
  ["verify", "Verifying successful activation", 1500],
  ["mark", "Permanently marking domain USED", 800],
  ["success", "Rotation successful", 400],
];
const DURATION: Record<string, number> = Object.fromEntries(
  [...PURCHASE_STAGES, ...ROTATION_STAGES].map(([k, , d]) => [k, d]),
);

interface DemoStage extends Stage {
  failWith?: OpError;
}
interface Store {
  prefix: string;
  nextNumber: number;
  balance: number;
  domains: Domain[];
  jobs: Job[];
  schedules: Schedule[];
  runs: RotationRun[];
  activity: Activity[];
  kuma: KumaStatus;
  conversations: AiConversation[];
  settings: Settings;
}

function ago(min: number) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

function seed(): Store {
  const mk = (n: number, status: DomainStatus, extra: Partial<Domain> = {}): Domain => ({
    name: `simi${n}.shop`,
    status,
    registeredAt: ago(60 * 24 * (90 - n)),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * (275 + n)).toISOString(),
    price: 0.98,
    verified: status !== "WAITING" && status !== "FAILED",
    workerAttached: !["WAITING", "ACTION_REQUIRED", "FAILED", "PREPARING"].includes(status),
    sslActive: !["WAITING", "FAILED"].includes(status),
    zoneActive: status !== "FAILED",
    usageHistory: [],
    ...extra,
  });
  const domains: Domain[] = [];
  for (let n = 70; n <= 74; n++) {
    const at = ago(60 * 24 * (75 - n));
    domains.push(mk(n, "USED", { usedAt: at, usageHistory: [{ activatedAt: at, deactivatedAt: ago(60 * 24 * (74 - n)), trigger: "schedule" }] }));
  }
  domains.push(mk(75, "IN_USE", { usedAt: ago(300), usageHistory: [{ activatedAt: ago(300), trigger: "schedule" }] }));
  for (let n = 76; n <= 80; n++) domains.push(mk(n, "READY"));
  domains.push(mk(81, "WAITING"));
  domains.push(
    mk(82, "ACTION_REQUIRED", {
      lastError: {
        code: "CF_WORKER_ROUTE_CONFLICT",
        message: "Worker route already exists",
        explanation: "Cloudflare reports another route already uses this pattern, so the Worker couldn't be attached.",
        retrySafe: true,
      },
    }),
  );
  domains.push(
    mk(83, "FAILED", {
      lastError: {
        code: "CF_ZONE_REJECTED",
        message: "Zone creation rejected",
        explanation: "Cloudflare refused to create the zone for this domain. It was skipped so the batch could continue.",
        retrySafe: true,
      },
    }),
  );

  const activity: Activity[] = [
    { id: uid(), type: "rotation", status: "success", title: "Rotated to simi75.shop", summary: "Kuma ADP landing updated and verified.", at: ago(300), domain: "simi75.shop", steps: ROTATION_STAGES.map(([, l]) => ({ label: l, status: "done" })) },
    { id: uid(), type: "recovery", status: "success", title: "Recovered Cloudflare activation", summary: "AI re-checked nameservers and activation completed.", at: ago(420), domain: "simi80.shop" },
    { id: uid(), type: "worker", status: "error", title: "Worker attach failed on simi82.shop", summary: "Route conflict on Cloudflare.", at: ago(500), domain: "simi82.shop", explanation: "Another Worker route already matches this domain. Removing the old route and retrying usually fixes it." },
    { id: uid(), type: "ai", status: "info", title: "AI health check", summary: "All 4 integrations responded normally.", at: ago(620) },
    { id: uid(), type: "purchase", status: "success", title: "Purchased 5 domains", summary: "simi76.shop – simi80.shop at $0.98 each.", at: ago(60 * 26) },
    { id: uid(), type: "preparation", status: "warning", title: "simi81.shop waiting for activation", summary: "Cloudflare is still verifying nameservers.", at: ago(60 * 3), domain: "simi81.shop" },
  ];

  return {
    prefix: "simi",
    nextNumber: 84,
    balance: 24.6,
    domains,
    jobs: [],
    schedules: [],
    runs: [
      { id: uid(), jobId: uid(), domain: "simi75.shop", previousUrl: landingUrl("simi74.shop"), newUrl: landingUrl("simi75.shop"), trigger: "schedule", state: "completed", startedAt: ago(300), finishedAt: ago(299) },
      { id: uid(), jobId: uid(), domain: "simi74.shop", previousUrl: landingUrl("simi73.shop"), newUrl: landingUrl("simi74.shop"), trigger: "manual", state: "completed", startedAt: ago(60 * 24), finishedAt: ago(60 * 24 - 1) },
    ],
    activity,
    kuma: { connected: true, currentDomain: "simi75.shop", currentUrl: landingUrl("simi75.shop"), campaign: "ADP Main", landingPath: "/adultp/", checkedAt: now() },
    conversations: [],
    settings: {
      namecheap: { apiUser: "simi_ops", username: "simi_ops", clientIp: "203.0.113.24", maxPrice: MAX_PRICE, prefix: "simi", autoRenew: false },
      cloudflare: { accountId: "a1b2c3d4e5", workerName: "adp-landing-worker", routePattern: "*{domain}/*", sslMode: "full", alwaysHttps: true },
      kuma: { baseUrl: "https://tracker.example.com", campaignId: "ADP-001", landingPath: "/adultp/" },
      openrouter: {
        model: "anthropic/claude-sonnet-4.5",
        fallbackModel: "openai/gpt-5-mini",
        monitoring: true,
        autoRecovery: true,
        usage: {
          month: "November 2026",
          requests: 412,
          costUsd: 3.84,
          daily: Array.from({ length: 14 }, (_, i) => ({ day: `D${i + 1}`, requests: 12 + Math.round(Math.abs(Math.sin(i)) * 30) })),
        },
      },
      automation: { defaultQuantity: 3, timezone: "Africa/Lagos", lowPoolThreshold: 3, notifyOnFailure: true, notifyOnRotation: true },
      secretsSet: { namecheap: true, cloudflare: true, kuma: true, openrouter: true },
    },
  };
}

let store: Store | null = null;
function db(): Store {
  if (store) return store;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    store = raw ? (JSON.parse(raw) as Store) : seed();
  } catch {
    store = seed();
  }
  return store;
}
function persist() {
  if (typeof window !== "undefined" && store) localStorage.setItem(KEY, JSON.stringify(store));
}
export function resetDemo() {
  store = seed();
  persist();
}

function log(a: Omit<Activity, "id" | "at">) {
  db().activity.unshift({ id: uid(), at: now(), ...a });
  db().activity = db().activity.slice(0, 300);
}

function domain(name: string) {
  return db().domains.find((d) => d.name === name);
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------- job simulation ----------

function makeStages(defs: [string, string, number][]): DemoStage[] {
  return defs.map(([key, label]) => ({ key, label, status: "pending" }));
}

function onStageStart(job: Job, item: JobItem, st: Stage) {
  if (job.type !== "purchase") return;
  const d = domain(item.domain);
  if (st.key === "activation" && d) d.status = "WAITING";
  if (st.key === "ssl" && d) d.status = "PREPARING";
  st.message =
    st.key === "activation" ? "Cloudflare is verifying nameservers. This can take a few minutes." : undefined;
  if (st.key === "activation") st.status = "waiting";
}

function onStageDone(job: Job, item: JobItem, st: Stage) {
  const s = db();
  if (job.type === "purchase") {
    if (st.key === "purchase") {
      s.balance = Math.round((s.balance - 0.98) * 100) / 100;
      if (!domain(item.domain))
        s.domains.push({
          name: item.domain,
          status: "PREPARING",
          registeredAt: now(),
          expiresAt: new Date(Date.now() + 365 * 864e5).toISOString(),
          price: 0.98,
          verified: false,
          workerAttached: false,
          sslActive: false,
          zoneActive: false,
          usageHistory: [],
          jobId: job.id,
        });
      st.message = "Registered for $0.98";
    }
    const d = domain(item.domain);
    if (!d) return;
    if (st.key === "zone") st.message = "Zone created";
    if (st.key === "nameservers") st.message = "ana.ns.cloudflare.com, bob.ns.cloudflare.com";
    if (st.key === "activation") {
      d.zoneActive = true;
      st.message = "Zone active";
    }
    if (st.key === "ssl") {
      d.sslActive = true;
      st.message = "Full SSL, Always HTTPS on";
    }
    if (st.key === "worker") {
      d.workerAttached = true;
      st.message = "Attached adp-landing-worker";
    }
    if (st.key === "landing") {
      d.verified = true;
      st.message = `${landingUrl(d.name)} responded 200`;
    }
    if (st.key === "ready") {
      d.status = "READY";
      d.lastError = undefined;
      log({ type: "preparation", status: "success", title: `${d.name} is READY`, summary: "Purchased, configured and verified.", domain: d.name, jobId: job.id });
    }
  } else {
    if (st.key === "update") st.message = `Landing set to ${landingUrl(item.domain)}`;
    if (st.key === "readback") st.message = "Kuma returned the new URL";
    if (st.key === "verify") st.message = "Landing responded 200";
    if (st.key === "mark") {
      const prev = s.domains.find((d) => d.status === "IN_USE");
      if (prev) {
        prev.status = "USED";
        const h = prev.usageHistory.at(-1);
        if (h) h.deactivatedAt = now();
      }
      const d = domain(item.domain);
      if (d) {
        d.status = "IN_USE";
        d.usedAt = d.usedAt ?? now();
        d.usageHistory.push({ activatedAt: now(), trigger: job.trigger ?? "manual" });
      }
      const prevUrl = s.kuma.currentUrl;
      s.kuma.currentDomain = item.domain;
      s.kuma.currentUrl = landingUrl(item.domain);
      const run = s.runs.find((r) => r.jobId === job.id);
      if (run) run.previousUrl = prevUrl;
    }
  }
}

function advance(job: Job) {
  const t = Date.now();
  let guard = 0;
  while (guard++ < 200) {
    if (job.state === "attention" || job.state === "completed" || job.state === "failed") return;
    const item = job.items[job.currentIndex];
    if (!item) {
      job.state = job.items.some((i) => i.status === "done") ? "completed" : "failed";
      job.updatedAt = now();
      if (job.type === "rotation") {
        const run = db().runs.find((r) => r.jobId === job.id);
        if (run) {
          run.state = job.state;
          run.finishedAt = now();
        }
        const ok = job.state === "completed";
        log({ type: "rotation", status: ok ? "success" : "error", title: ok ? `Rotated to ${job.items[0].domain}` : "Rotation failed", summary: ok ? "Kuma ADP landing updated, read back and verified." : "See job details.", domain: job.items[0].domain, jobId: job.id, steps: job.items[0].stages.map((s) => ({ label: s.label, status: s.status })) });
      } else {
        const done = job.items.filter((i) => i.status === "done").length;
        log({ type: "purchase", status: "success", title: `Batch finished: ${done} of ${job.items.length} READY`, summary: job.items.map((i) => `${i.domain} — ${i.status}`).join(", "), jobId: job.id });
      }
      return;
    }
    job.state = "running";
    item.status = "running";
    const stages = item.stages as DemoStage[];
    const active = stages.find((s) => s.status === "running" || s.status === "waiting");
    if (!active) {
      const next = stages.find((s) => s.status === "pending");
      if (!next) {
        item.status = "done";
        job.currentIndex++;
        continue;
      }
      const prevDone = [...stages].reverse().find((s) => s.finishedAt);
      next.startedAt = prevDone?.finishedAt ?? job.updatedAt ?? now();
      if (new Date(next.startedAt).getTime() > t) next.startedAt = now();
      next.status = "running";
      onStageStart(job, item, next);
      continue;
    }
    const end = new Date(active.startedAt!).getTime() + (DURATION[active.key] ?? 1000);
    if (t < end) return;
    if (active.failWith) {
      active.status = "attention";
      active.error = active.failWith;
      active.message = active.failWith.message;
      delete active.failWith;
      item.status = "attention";
      job.state = "attention";
      job.updatedAt = now();
      const d = domain(item.domain);
      if (d) {
        d.status = "ACTION_REQUIRED";
        d.lastError = active.error;
      }
      log({ type: active.key === "worker" ? "worker" : "purchase", status: "error", title: `${active.label} needs attention — ${item.domain}`, summary: active.error!.message, explanation: active.error!.explanation, domain: item.domain, jobId: job.id });
      return;
    }
    active.status = "done";
    active.finishedAt = new Date(end).toISOString();
    onStageDone(job, item, active);
    job.updatedAt = active.finishedAt;
  }
}

function tick() {
  const s = db();
  s.jobs.forEach(advance);
  // Schedules
  const t = new Date();
  for (const sc of s.schedules) {
    if (sc.state === "paused" || !sc.nextRunAt) continue;
    if (new Date(sc.nextRunAt) > t) continue;
    const busy = s.jobs.some((j) => j.type === "rotation" && (j.state === "running" || j.state === "attention"));
    if (busy) continue;
    const first = sc.runs === 0 ? sc.firstDomain : undefined;
    const target = pickNextDomain(s.domains, first);
    sc.lastRunAt = t.toISOString();
    sc.nextRunAt = nextRuns(sc, t, 1)[0]?.toISOString();
    if (!target) {
      sc.state = "waiting_for_domains";
      sc.lastResult = "no_domains";
      s.runs.unshift({ id: uid(), jobId: "", trigger: "schedule", state: "no_domains", startedAt: t.toISOString(), finishedAt: t.toISOString(), previousUrl: s.kuma.currentUrl });
      log({ type: "schedule", status: "warning", title: "Scheduled rotation skipped — no READY domains", summary: `Kept current landing ${s.kuma.currentUrl}.` });
      continue;
    }
    sc.state = "active";
    sc.runs++;
    sc.lastResult = "success";
    createRotationJob(target.name, "schedule", sc.id);
  }
  persist();
}

function createRotationJob(name: string, trigger: "manual" | "schedule", scheduleId?: string) {
  const s = db();
  const d = domain(name);
  if (d) d.status = "PREPARING";
  // Preparing marker is temporary; restore READY visual until 'mark' stage.
  if (d) d.status = "READY";
  const job: Job = {
    id: `job_${uid()}`,
    type: "rotation",
    state: "running",
    createdAt: now(),
    updatedAt: now(),
    currentIndex: 0,
    trigger,
    scheduleId,
    items: [{ domain: name, status: "pending", stages: makeStages(ROTATION_STAGES) }],
  };
  s.jobs.unshift(job);
  s.runs.unshift({ id: uid(), jobId: job.id, domain: name, previousUrl: s.kuma.currentUrl, newUrl: landingUrl(name), trigger, state: "running", startedAt: now() });
  return job;
}

function counts(): Record<DomainStatus, number> {
  const c = { READY: 0, PREPARING: 0, WAITING: 0, ACTION_REQUIRED: 0, IN_USE: 0, USED: 0, FAILED: 0 } as Record<DomainStatus, number>;
  db().domains.forEach((d) => c[d.status]++);
  return c;
}

function integrations(): Integration[] {
  const t = now();
  return [
    { id: "namecheap", name: "Namecheap", status: "connected", latencyMs: 312, checkedAt: t, message: "API reachable, IP whitelisted" },
    { id: "cloudflare", name: "Cloudflare", status: "connected", latencyMs: 88, checkedAt: t, message: "Token valid, Worker found" },
    { id: "kuma", name: "Simple Kuma", status: db().kuma.connected ? "connected" : "disconnected", latencyMs: 140, checkedAt: t, message: "ADP campaign readable" },
    { id: "openrouter", name: "OpenRouter", status: "connected", latencyMs: 420, checkedAt: t, message: "Primary model available" },
  ];
}

// ---------- AI demo ----------

function b(kind: AiBlock["kind"], title: string, rest: Partial<AiBlock> = {}): AiBlock {
  return { id: uid(), kind, title, status: "done", ...rest };
}

function script(text: string): { intro: string; blocks: AiBlock[]; outro: string } {
  const t = text.toLowerCase();
  const s = db();
  if (t.includes("not ready") || (t.includes("why") && t.includes("ready"))) {
    const stuck = s.domains.find((d) => d.status === "ACTION_REQUIRED") ?? s.domains.find((d) => d.status === "WAITING");
    if (!stuck) return { intro: "I checked every domain in your inventory.", blocks: [b("recovery_success", "Every prepared domain is READY")], outro: "Nothing is stuck right now." };
    return {
      intro: `I looked into ${stuck.name}.`,
      blocks: [
        b("investigating", `Inspecting ${stuck.name}`, { tool: "domains.inspect", items: [{ label: "Registration", status: "ok" }, { label: "Cloudflare zone", status: stuck.zoneActive ? "ok" : "warn" }, { label: "SSL", status: stuck.sslActive ? "ok" : "warn" }, { label: "Worker route", status: stuck.workerAttached ? "ok" : "error", detail: stuck.lastError?.message }] }),
        b("diagnosis", "Likely cause", { body: stuck.lastError?.explanation ?? "Cloudflare hasn't finished verifying the nameservers yet." }),
        b("fix", "Recommended fix", { body: stuck.lastError?.retrySafe !== false ? "Retry the preparation from the failed step. It's safe — nothing will be purchased again." : "Check Cloudflare manually.", action: { label: `Retry ${stuck.name}`, op: "retry_domain", target: stuck.name } }),
      ],
      outro: "Want me to retry it now?",
    };
  }
  if (t.includes("integration") || t.includes("api") || t.includes("connection") || t.includes("cloudflare")) {
    const only = t.includes("cloudflare") && !t.includes("all") ? ["cloudflare"] : undefined;
    const list = integrations().filter((i) => !only || only.includes(i.id));
    return {
      intro: only ? "Checking your Cloudflare connection." : "Running a health check on all integrations.",
      blocks: [b("api_check", only ? "Cloudflare check" : "Integration check", { tool: "integrations.test", items: list.map((i) => ({ label: i.name, status: i.status === "connected" ? "ok" : "error", detail: `${i.message} · ${i.latencyMs}ms` })) })],
      outro: "Everything responded normally.",
    };
  }
  if (t.includes("purchase") || t.includes("buy")) {
    const failed = s.activity.find((a) => (a.type === "purchase" || a.type === "worker") && a.status === "error");
    return {
      intro: "I reviewed the latest purchase history.",
      blocks: failed
        ? [b("investigating", "Reading purchase log", { tool: "activity.search" }), b("diagnosis", failed.title, { body: failed.explanation ?? failed.summary }), b("action_required", "Your decision needed", { body: "If an order timed out after being sent, I won't retry it automatically to avoid a double charge. I'll verify with Namecheap first.", action: { label: "Verify with registrar", op: "verify_registration", target: failed.jobId } })]
        : [b("recovery_success", "No failed purchases found")],
      outro: "",
    };
  }
  if (t.includes("kuma") || t.includes("rotat")) {
    return {
      intro: "I checked Simple Kuma and the last rotations.",
      blocks: [
        b("api_check", "Simple Kuma", { tool: "kuma.status", items: [{ label: "Connection", status: "ok" }, { label: "ADP landing", status: "ok", detail: s.kuma.currentUrl }, { label: "READY pool", status: counts().READY > 0 ? "ok" : "warn", detail: `${counts().READY} domains` }] }),
        b("diagnosis", "Last rotation", { body: s.runs[0]?.state === "no_domains" ? "The schedule ran but no never-used READY domain was available, so the current landing was kept." : `The last rotation to ${s.runs[0]?.domain} completed and was read back successfully.` }),
      ],
      outro: counts().READY === 0 ? "Buy more domains to resume rotation." : "",
    };
  }
  if (t.includes("available") || t.includes("which domain")) {
    const ready = s.domains.filter((d) => d.status === "READY" && !d.usedAt);
    return { intro: `You have ${ready.length} READY domains available.`, blocks: [b("api_check", "READY pool", { tool: "domains.list", items: ready.map((d) => ({ label: d.name, status: "ok", detail: "Verified · Worker attached" })) })], outro: ready.length ? `Next in line: ${ready[0].name}.` : "" };
  }
  return { intro: "I'm watching your domains, schedules and integrations.", blocks: [b("investigating", "Quick system scan", { tool: "system.scan", items: [{ label: "Integrations", status: "ok" }, { label: "Running jobs", status: "ok", detail: `${s.jobs.filter((j) => j.state === "running").length} active` }, { label: "Domains needing attention", status: counts().ACTION_REQUIRED ? "warn" : "ok", detail: String(counts().ACTION_REQUIRED) }] })], outro: "Ask me about a specific domain, purchase or rotation." };
}

// ---------- adapter ----------

export const demoApi: Api = {
  mode: "demo",
  async health() {
    await latency();
    return { ok: true, version: "demo", time: now() };
  },
  async overview() {
    tick();
    await latency();
    const s = db();
    const next = s.schedules.filter((x) => x.state !== "paused" && x.nextRunAt).map((x) => x.nextRunAt!).sort()[0];
    const running = s.jobs.filter((j) => j.state === "running" || j.state === "attention");
    return clone({
      counts: counts(),
      total: s.domains.length,
      activeDomain: s.kuma.currentDomain,
      activeUrl: s.kuma.currentUrl,
      balance: s.balance,
      currency: "USD",
      nextRotationAt: next,
      ai: running.some((j) => j.state === "attention")
        ? { state: "investigating" as const, focus: "A job needs attention — reviewing the error" }
        : running.length
          ? { state: "assisting" as const, focus: `Watching ${running.length} running job${running.length > 1 ? "s" : ""}` }
          : { state: "monitoring" as const, focus: "All systems normal" },
      runningJobs: running,
      integrations: integrations(),
    });
  },
  async integrations() {
    await latency();
    return integrations();
  },
  async testIntegration(id) {
    await wait(900);
    return integrations().find((i) => i.id === id)!;
  },
  async listDomains(q) {
    tick();
    await latency();
    let list = db().domains.slice();
    if (q.status && q.status !== "all") list = list.filter((d) => d.status === q.status);
    if (q.q) list = list.filter((d) => d.name.includes(q.q!.toLowerCase()));
    list.sort((a, b) => (q.sort === "status" ? a.status.localeCompare(b.status) : b.name.localeCompare(a.name, undefined, { numeric: true })));
    const page = q.page ?? 1;
    const size = q.pageSize ?? 12;
    return clone({ items: list.slice((page - 1) * size, page * size), total: list.length, page, pageSize: size });
  },
  async allDomains() {
    tick();
    await latency();
    return clone(db().domains);
  },
  async getDomain(name) {
    tick();
    await latency();
    const d = domain(name);
    if (!d) throw new Error("Domain not found");
    return clone(d);
  },
  async retryPreparation(name) {
    await latency();
    const s = db();
    const d = domain(name);
    if (!d) throw new Error("Domain not found");
    const existing = s.jobs.find((j) => j.items.some((i) => i.domain === name) && j.state === "attention");
    if (existing) return this.retryStage(existing.id);
    const stages = makeStages(PURCHASE_STAGES);
    stages.forEach((st) => {
      if (st.key === "purchase" || st.key === "zone" || st.key === "nameservers") {
        st.status = "done";
        st.finishedAt = now();
        st.message = "Already complete";
      }
    });
    const job: Job = { id: `job_${uid()}`, type: "purchase", state: "running", createdAt: now(), updatedAt: now(), currentIndex: 0, items: [{ domain: name, status: "running", stages }] };
    d.status = "PREPARING";
    d.lastError = undefined;
    s.jobs.unshift(job);
    log({ type: "recovery", status: "running", title: `Retrying preparation for ${name}`, summary: "Resuming from Cloudflare activation.", domain: name, jobId: job.id });
    tick();
    return clone(job);
  },
  async nextNumber() {
    await latency();
    return { prefix: db().prefix, nextNumber: db().nextNumber, tld: ".shop" };
  },
  async quote(quantity) {
    await wait(700);
    const s = db();
    const owned = new Set(s.domains.map((d) => d.name));
    // Look ahead a few names so excluded ones can be skipped.
    const names = sequentialNames(s.prefix, s.nextNumber, quantity + 3);
    const candidates = names.map((domain, i) => {
      const c = { domain, available: true, price: 0.98, premium: false } as { domain: string; available: boolean; price: number; premium: boolean; excludedReason?: string };
      if (i === 2) c.available = false; // demo: one taken name
      if (i === 5) c.premium = true;
      c.excludedReason = exclusionReason(c, owned, s.settings.namecheap.maxPrice) ?? undefined;
      return c;
    });
    return { candidates, balance: s.balance, maxPrice: s.settings.namecheap.maxPrice, currency: "USD" };
  },
  async startPurchase(domains) {
    await latency();
    const s = db();
    const items: JobItem[] = domains.map((d, i) => {
      const stages = makeStages(PURCHASE_STAGES);
      // Demo scenarios: a recoverable Worker error on #2, an uncertain purchase on #4.
      if (i === 1) stages[5].failWith = { code: "CF_WORKER_ROUTE_CONFLICT", message: "Worker route conflict", explanation: "Cloudflare already has a route matching this domain. Retrying will replace the stale route.", retrySafe: true };
      if (i === 3) stages[0].failWith = { code: "NC_TIMEOUT_AFTER_ORDER", message: "Namecheap timed out after the order was sent", explanation: "We can't tell yet whether this domain was registered. Retrying could buy it twice, so verify with Namecheap first.", retrySafe: false, uncertain: true };
      return { domain: d, status: "pending", stages };
    });
    const maxNum = Math.max(...domains.map((d) => Number(d.match(/(\d+)\.shop$/)?.[1] ?? 0)));
    s.nextNumber = Math.max(s.nextNumber, maxNum + 1);
    const job: Job = { id: `job_${uid()}`, type: "purchase", state: "running", createdAt: now(), updatedAt: now(), currentIndex: 0, items };
    s.jobs.unshift(job);
    log({ type: "purchase", status: "running", title: `Started purchase of ${domains.length} domain${domains.length > 1 ? "s" : ""}`, summary: domains.join(", "), jobId: job.id });
    tick();
    return clone(job);
  },
  async getJob(id) {
    tick();
    await wait(60);
    const j = db().jobs.find((x) => x.id === id);
    if (!j) throw new Error("Job not found");
    return clone(j);
  },
  async listJobs() {
    tick();
    return clone(db().jobs.filter((j) => j.state === "running" || j.state === "attention"));
  },
  async retryStage(id) {
    await latency();
    const j = db().jobs.find((x) => x.id === id);
    if (!j) throw new Error("Job not found");
    const item = j.items[j.currentIndex];
    const st = item?.stages.find((s) => s.status === "attention" || s.status === "failed");
    if (!st || !st.error?.retrySafe) throw new Error("This step cannot be retried safely");
    st.status = "pending";
    st.error = undefined;
    st.message = undefined;
    item.status = "running";
    j.state = "running";
    j.updatedAt = now();
    const d = domain(item.domain);
    if (d) {
      d.status = "PREPARING";
      d.lastError = undefined;
    }
    log({ type: "recovery", status: "running", title: `Retrying "${st.label}"`, summary: item.domain, domain: item.domain, jobId: j.id });
    tick();
    return clone(j);
  },
  async verifyRegistration(id) {
    await wait(1200);
    const j = db().jobs.find((x) => x.id === id) ?? db().jobs.find((x) => x.state === "attention");
    if (!j) throw new Error("Job not found");
    const item = j.items[j.currentIndex];
    const st = item?.stages.find((s) => s.key === "purchase" && s.status === "attention");
    if (!st) return clone(j);
    // Demo: registrar confirms the order went through.
    st.status = "done";
    st.error = undefined;
    st.finishedAt = now();
    st.message = "Verified with Namecheap — registration confirmed, no second order placed";
    onStageDone(j, item, { ...st, message: undefined });
    st.message = "Verified with Namecheap — registration confirmed";
    item.status = "running";
    j.state = "running";
    j.updatedAt = now();
    log({ type: "recovery", status: "success", title: `Registration confirmed for ${item.domain}`, summary: "Verified with registrar; continuing preparation.", domain: item.domain, jobId: j.id });
    tick();
    return clone(j);
  },
  async skipItem(id) {
    await latency();
    const j = db().jobs.find((x) => x.id === id);
    if (!j) throw new Error("Job not found");
    const item = j.items[j.currentIndex];
    if (item) {
      item.status = "skipped";
      item.stages.forEach((s) => {
        if (s.status === "pending") s.status = "skipped";
      });
      const d = domain(item.domain);
      if (d) d.status = "FAILED";
      j.currentIndex++;
      j.state = "running";
      log({ type: "purchase", status: "warning", title: `Skipped ${item.domain}`, summary: "Batch continued with the next domain.", domain: item.domain, jobId: j.id });
    }
    tick();
    return clone(j);
  },
  async kumaStatus() {
    await wait(500);
    return clone({ ...db().kuma, checkedAt: now() });
  },
  async rotateNow(name) {
    await latency();
    const target = pickNextDomain(db().domains, name);
    if (!target) throw new Error("No READY domains available");
    const job = createRotationJob(target.name, "manual");
    log({ type: "rotation", status: "running", title: `Rotation to ${target.name} started`, summary: "Manual rotation", domain: target.name, jobId: job.id });
    tick();
    return clone(job);
  },
  async rotationHistory() {
    tick();
    await latency();
    return clone(db().runs.slice(0, 50));
  },
  async listSchedules() {
    tick();
    await latency();
    return clone(db().schedules);
  },
  async createSchedule(input) {
    await latency();
    const sc: Schedule = { ...input, id: `sch_${uid()}`, state: "active", createdAt: now(), nextRunAt: nextRuns(input, new Date(), 1)[0]?.toISOString(), runs: 0 };
    db().schedules.unshift(sc);
    log({ type: "schedule", status: "success", title: "Automatic rotation enabled", summary: `First run ${new Date(sc.nextRunAt!).toLocaleString()}${input.firstDomain ? ` with ${input.firstDomain}` : ""}. No rotation has happened yet.` });
    persist();
    return clone(sc);
  },
  async updateSchedule(id, patch) {
    await latency();
    const sc = db().schedules.find((x) => x.id === id);
    if (!sc) throw new Error("Schedule not found");
    sc.state = patch.state;
    if (patch.state === "active") sc.nextRunAt = nextRuns(sc, new Date(), 1)[0]?.toISOString();
    persist();
    return clone(sc);
  },
  async deleteSchedule(id) {
    await latency();
    db().schedules = db().schedules.filter((x) => x.id !== id);
    persist();
  },
  async activity(q) {
    tick();
    await latency();
    let list = db().activity;
    if (q.type && q.type !== "all") list = list.filter((a) => a.type === q.type);
    if (q.status && q.status !== "all") list = list.filter((a) => a.status === q.status);
    if (q.since) list = list.filter((a) => a.at >= q.since!);
    if (q.q) {
      const k = q.q.toLowerCase();
      list = list.filter((a) => `${a.title} ${a.summary} ${a.domain ?? ""}`.toLowerCase().includes(k));
    }
    return clone(list);
  },
  async conversations() {
    await latency();
    return clone(db().conversations.map((c) => ({ ...c, messages: [] })));
  },
  async conversation(id) {
    await latency();
    const c = db().conversations.find((x) => x.id === id);
    if (!c) throw new Error("Conversation not found");
    return clone(c);
  },
  async chat(conversationId, text, onEvent, signal) {
    const s = db();
    let conv = s.conversations.find((c) => c.id === conversationId);
    if (!conv) {
      conv = { id: `conv_${uid()}`, title: text.slice(0, 48), updatedAt: now(), messages: [] };
      s.conversations.unshift(conv);
    }
    conv.messages.push({ id: uid(), role: "user", text, blocks: [], at: now() });
    const msg: AiMessage = { id: uid(), role: "assistant", text: "", blocks: [], at: now(), model: s.settings.openrouter.model };
    const emit = (e: AiEvent) => !signal?.aborted && onEvent(e);
    emit({ type: "status", state: "investigating" });
    emit({ type: "message_start", id: msg.id, model: msg.model });
    const sc = script(text);
    for (const w of sc.intro.split(/(\s+)/)) {
      await wait(25);
      msg.text += w;
      emit({ type: "text", delta: w });
    }
    for (const blk of sc.blocks) {
      await wait(400);
      const running = { ...blk, status: "running" as const, items: blk.items?.map((i) => ({ ...i, status: "running" as const })) };
      emit({ type: "block", block: running });
      await wait(900 + (blk.items?.length ?? 0) * 150);
      emit({ type: "block_update", id: blk.id, patch: { status: "done", items: blk.items } });
      msg.blocks.push(blk);
    }
    if (sc.outro) {
      await wait(200);
      const d = `\n\n${sc.outro}`;
      msg.text += d;
      emit({ type: "text", delta: d });
    }
    conv.messages.push(msg);
    conv.updatedAt = now();
    log({ type: "ai", status: "info", title: "AI investigation", summary: text.slice(0, 120) });
    persist();
    emit({ type: "status", state: "monitoring" });
    emit({ type: "done", conversationId: conv.id });
  },
  async aiAction(a) {
    if (a.op === "retry_domain" && a.target) {
      const job = await this.retryPreparation(a.target);
      return { ok: true, message: `Retrying ${a.target}`, jobId: job.id };
    }
    if (a.op === "verify_registration") {
      const job = await this.verifyRegistration(a.target ?? "");
      return { ok: true, message: "Verified with registrar", jobId: job.id };
    }
    if (a.op === "rotate_now") {
      const job = await this.rotateNow(a.target);
      return { ok: true, message: "Rotation started", jobId: job.id };
    }
    await wait(800);
    return { ok: true, message: "All integrations responded" };
  },
  async settings() {
    await latency();
    return clone(db().settings);
  },
  async saveSettings(section, values) {
    await latency();
    (db().settings as unknown as Record<string, unknown>)[section] = values;
    if (section === "namecheap") db().prefix = (values as Settings["namecheap"]).prefix;
    persist();
    return clone(db().settings);
  },
  async saveSecrets(section, secrets) {
    await latency();
    // Demo never stores secret values — only records that one was provided.
    if (Object.values(secrets).some(Boolean)) db().settings.secretsSet[section] = true;
    persist();
    return clone(db().settings);
  },
};
