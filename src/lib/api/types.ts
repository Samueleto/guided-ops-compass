// Shared contract types between the frontend and the Domain Manager AI backend.
// Keep in sync with API_CONTRACT.md.

export type DomainStatus =
  | "READY"
  | "PREPARING"
  | "WAITING"
  | "ACTION_REQUIRED"
  | "IN_USE"
  | "USED"
  | "FAILED";

export interface DomainUsage {
  activatedAt: string;
  deactivatedAt?: string | undefined;
  trigger: "manual" | "schedule";
}

export interface Domain {
  name: string;
  status: DomainStatus;
  registeredAt?: string | undefined;
  expiresAt?: string | undefined;
  price?: number | undefined;
  verified: boolean;
  workerAttached: boolean;
  sslActive: boolean;
  zoneActive: boolean;
  /** Set once the domain has ever been activated in Kuma. Never cleared. */
  usedAt?: string | undefined;
  usageHistory: DomainUsage[];
  lastError?: OpError | undefined;
  jobId?: string | undefined;
}

export interface OpError {
  code: string;
  message: string;
  /** Plain-language explanation for the owner. */
  explanation: string;
  /** True only when the backend confirms retrying cannot cause a duplicate charge or change. */
  retrySafe: boolean;
  /** Outcome unknown (e.g. timeout after order sent). Must verify before any retry. */
  uncertain?: boolean | undefined;
}

export type StageStatus =
  | "pending"
  | "running"
  | "waiting"
  | "done"
  | "attention"
  | "failed"
  | "skipped";

export interface Stage {
  key: string;
  label: string;
  status: StageStatus;
  message?: string | undefined;
  startedAt?: string | undefined;
  finishedAt?: string | undefined;
  error?: OpError | undefined;
}

export type ItemStatus = "pending" | "running" | "done" | "attention" | "failed" | "skipped";

export interface JobItem {
  domain: string;
  status: ItemStatus;
  stages: Stage[];
}

export type JobState = "queued" | "running" | "attention" | "completed" | "failed" | "cancelled";

export interface Job {
  id: string;
  type: "purchase" | "rotation";
  state: JobState;
  createdAt: string;
  updatedAt: string;
  currentIndex: number;
  items: JobItem[];
  trigger?: "manual" | "schedule" | undefined;
  scheduleId?: string | undefined;
}

export type IntegrationId = "namecheap" | "cloudflare" | "kuma" | "openrouter";

export interface Integration {
  id: IntegrationId;
  name: string;
  status: "connected" | "degraded" | "disconnected" | "unknown";
  latencyMs?: number | undefined;
  checkedAt?: string | undefined;
  message?: string | undefined;
}

export type AiState = "monitoring" | "investigating" | "assisting" | "idle" | "offline";

export interface Overview {
  counts: Record<DomainStatus, number>;
  total: number;
  activeDomain?: string | undefined;
  activeUrl?: string | undefined;
  balance?: number | undefined;
  currency: string;
  nextRotationAt?: string | undefined;
  ai: { state: AiState; focus?: string; updatedAt?: string };
  runningJobs: Job[];
  integrations: Integration[];
}

export interface Candidate {
  domain: string;
  available: boolean;
  price?: number | undefined;
  premium: boolean;
  /** Reason the domain cannot be bought; undefined means eligible. */
  excludedReason?: string | undefined;
}

export interface NextNumber {
  prefix: string;
  nextNumber: number;
  tld: ".shop";
}

export interface Quote {
  candidates: Candidate[];
  balance?: number | undefined;
  maxPrice: number;
  currency: string;
}

export interface KumaStatus {
  connected: boolean;
  currentUrl?: string | undefined;
  currentDomain?: string | undefined;
  campaign?: string | undefined;
  landingPath: "/adultp/";
  checkedAt?: string | undefined;
  message?: string | undefined;
}

export type ScheduleMode = "interval" | "daily" | "weekly";

export interface ScheduleInput {
  mode: ScheduleMode;
  intervalMinutes?: number | undefined;
  /** HH:mm in schedule timezone */
  time?: string | undefined;
  /** 0 = Sunday */
  weekday?: number | undefined;
  timezone: string;
  firstDomain?: string | undefined;
}

export interface Schedule extends ScheduleInput {
  id: string;
  state: "active" | "paused" | "waiting_for_domains";
  createdAt: string;
  nextRunAt?: string | undefined;
  lastRunAt?: string | undefined;
  lastResult?: "success" | "failed" | "no_domains" | undefined;
  runs: number;
}

export interface RotationRun {
  id: string;
  jobId: string;
  domain?: string | undefined;
  previousUrl?: string | undefined;
  newUrl?: string | undefined;
  trigger: "manual" | "schedule";
  state: JobState | "no_domains";
  startedAt: string;
  finishedAt?: string | undefined;
}

export type ActivityType =
  | "purchase"
  | "preparation"
  | "worker"
  | "verification"
  | "rotation"
  | "schedule"
  | "ai"
  | "recovery"
  | "system";

export type ActivityStatus = "success" | "error" | "warning" | "info" | "running";

export interface Activity {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  title: string;
  summary: string;
  at: string;
  domain?: string | undefined;
  jobId?: string | undefined;
  explanation?: string | undefined;
  steps?: { label: string | undefined; status: StageStatus }[];
  details?: Record<string, string> | undefined;
}

export interface ActivityQuery {
  q?: string | undefined;
  type?: ActivityType | "all" | undefined;
  status?: ActivityStatus | "all" | undefined;
  since?: string | undefined;
}

export interface DomainQuery {
  q?: string | undefined;
  status?: DomainStatus | "all" | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  sort?: "name" | "registered" | "status" | undefined;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------- AI ----------

export type AiBlockKind =
  | "investigating"
  | "api_check"
  | "diagnosis"
  | "fix"
  | "recovery"
  | "recovery_success"
  | "action_required";

export interface AiCheckItem {
  label: string;
  status: "ok" | "warn" | "error" | "running" | "pending";
  detail?: string | undefined;
}

export interface AiAction {
  label: string;
  op: "retry_domain" | "check_integrations" | "rotate_now" | "verify_registration" | "open";
  target?: string | undefined;
}

export interface AiBlock {
  id: string;
  kind: AiBlockKind;
  title: string;
  body?: string | undefined;
  items?: AiCheckItem[] | undefined;
  action?: AiAction | undefined;
  tool?: string | undefined;
  status?: "running" | "done" | "error" | undefined;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  blocks: AiBlock[];
  at: string;
  model?: string | undefined;
}

export interface AiConversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: AiMessage[];
}

export type AiEvent =
  | { type: "status"; state: AiState }
  | { type: "message_start"; id: string; model?: string }
  | { type: "text"; delta: string }
  | { type: "block"; block: AiBlock }
  | { type: "block_update"; id: string; patch: Partial<AiBlock> }
  | { type: "done"; conversationId: string }
  | { type: "error"; error: OpError };

// ---------- Settings ----------

export interface Settings {
  namecheap: {
    apiUser: string;
    username: string;
    clientIp: string;
    maxPrice: number;
    prefix: string;
    autoRenew: boolean;
  };
  cloudflare: {
    accountId: string;
    workerName: string;
    routePattern: string;
    sslMode: "full" | "strict" | "flexible";
    alwaysHttps: boolean;
  };
  kuma: { baseUrl: string; campaignId: string; landingPath: "/adultp/" };
  openrouter: {
    model: string;
    fallbackModel: string;
    monitoring: boolean;
    autoRecovery: boolean;
    usage?: { month: string | undefined; requests: number; costUsd: number; daily: { day: string; requests: number }[] };
  };
  automation: {
    defaultQuantity: number;
    timezone: string;
    lowPoolThreshold: number;
    notifyOnFailure: boolean;
    notifyOnRotation: boolean;
  };
  /** Which provider secrets are stored on the backend. Values are never returned. */
  secretsSet: Record<string, boolean>;
}

export type SettingsSection = Exclude<keyof Settings, "secretsSet">;

export interface Health {
  ok: boolean;
  version?: string | undefined;
  time: string;
}
