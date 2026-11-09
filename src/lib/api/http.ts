import type {
  Activity,
  ActivityQuery,
  AiAction,
  AiConversation,
  AiEvent,
  Domain,
  DomainQuery,
  Health,
  Integration,
  IntegrationId,
  Job,
  KumaStatus,
  NextNumber,
  OpError,
  Overview,
  Paged,
  Quote,
  RotationRun,
  Schedule,
  ScheduleInput,
  Settings,
  SettingsSection,
} from "./types";
import type { Api } from "./index";
import { getApiBase } from "../mode";

export class ApiError extends Error {
  constructor(
    public status: number,
    public error: OpError,
  ) {
    super(error.message);
  }
}

function url(path: string, query?: Record<string, unknown>) {
  const base = getApiBase().replace(/\/$/, "");
  const qs = query
    ? Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== "" && v !== "all")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  return `${base}${path}${qs ? `?${qs}` : ""}`;
}

async function req<T>(method: string, path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(url(path, query), {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new ApiError(0, {
      code: "NETWORK",
      message: "Could not reach the backend",
      explanation:
        "The Domain Manager server didn't respond. Check that it is running and the API address in Settings → Connection is correct.",
      retrySafe: true,
    });
  } finally {
    clearTimeout(t);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err: OpError = data?.error ?? {
      code: `HTTP_${res.status}`,
      message: res.statusText || "Request failed",
      explanation: "The server returned an unexpected error.",
      retrySafe: false,
    };
    throw new ApiError(res.status, err);
  }
  return data as T;
}

/** Parse a text/event-stream response into AiEvents. */
async function streamSse(res: Response, onEvent: (e: AiEvent) => void) {
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const data = chunk
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("\n");
      if (!data) continue;
      try {
        onEvent(JSON.parse(data) as AiEvent);
      } catch {
        /* ignore malformed */
      }
    }
  }
}

export const httpApi: Api = {
  mode: "live",
  health: () => req<Health>("GET", "/health"),
  overview: () => req<Overview>("GET", "/overview"),
  integrations: () => req<Integration[]>("GET", "/integrations"),
  testIntegration: (id: IntegrationId) => req<Integration>("POST", `/integrations/${id}/test`),

  listDomains: (q: DomainQuery) => req<Paged<Domain>>("GET", "/domains", undefined, { ...q }),
  allDomains: () => req<Domain[]>("GET", "/domains/all"),
  getDomain: (name: string) => req<Domain>("GET", `/domains/${encodeURIComponent(name)}`),
  retryPreparation: (name: string) => req<Job>("POST", `/domains/${encodeURIComponent(name)}/retry`),

  nextNumber: () => req<NextNumber>("GET", "/purchase/next-number"),
  quote: (quantity: number) => req<Quote>("POST", "/purchase/quote", { quantity }),
  startPurchase: (domains: string[]) => req<Job>("POST", "/purchase/jobs", { domains }),

  getJob: (id: string) => req<Job>("GET", `/jobs/${id}`),
  listJobs: () => req<Job[]>("GET", "/jobs", undefined, { active: true }),
  retryStage: (id: string) => req<Job>("POST", `/jobs/${id}/retry-stage`),
  verifyRegistration: (id: string) => req<Job>("POST", `/jobs/${id}/verify-registration`),
  skipItem: (id: string) => req<Job>("POST", `/jobs/${id}/skip-item`),

  kumaStatus: () => req<KumaStatus>("GET", "/kuma/status"),
  rotateNow: (domain?: string) => req<Job>("POST", "/rotation/run", { domain, auto: !domain }),
  rotationHistory: () => req<RotationRun[]>("GET", "/rotation/history"),
  listSchedules: () => req<Schedule[]>("GET", "/schedules"),
  createSchedule: (s: ScheduleInput) => req<Schedule>("POST", "/schedules", s),
  updateSchedule: (id: string, patch: { state: "active" | "paused" }) =>
    req<Schedule>("PATCH", `/schedules/${id}`, patch),
  deleteSchedule: (id: string) => req<void>("DELETE", `/schedules/${id}`),

  activity: (q: ActivityQuery) => req<Activity[]>("GET", "/activity", undefined, { ...q }),

  conversations: () => req<AiConversation[]>("GET", "/ai/conversations"),
  conversation: (id: string) => req<AiConversation>("GET", `/ai/conversations/${id}`),
  async chat(conversationId, text, onEvent, signal) {
    const res = await fetch(url("/ai/chat"), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify({ conversationId, message: text }),
      credentials: "include",
      signal,
    }).catch(() => null);
    if (!res || !res.ok) {
      onEvent({
        type: "error",
        error: {
          code: "AI_UNAVAILABLE",
          message: "AI assistant unavailable",
          explanation: "The backend could not start an AI session. Check the OpenRouter connection in Settings.",
          retrySafe: true,
        },
      });
      return;
    }
    await streamSse(res, onEvent);
  },
  aiAction: (a: AiAction) => req<{ ok: boolean; message: string; jobId?: string }>("POST", "/ai/actions", a),

  settings: () => req<Settings>("GET", "/settings"),
  saveSettings: <K extends SettingsSection>(section: K, values: Settings[K]) =>
    req<Settings>("PUT", `/settings/${section}`, values),
  saveSecrets: (section: SettingsSection, secrets: Record<string, string>) =>
    req<Settings>("PUT", `/settings/${section}/secrets`, secrets),
};
