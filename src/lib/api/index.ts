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
  Overview,
  Paged,
  Quote,
  RotationRun,
  Schedule,
  ScheduleInput,
  Settings,
  SettingsSection,
} from "./types";
import { httpApi } from "./http";
import { demoApi } from "./demo";
import { getMode } from "../mode";

export interface Api {
  mode: "demo" | "live";
  health(): Promise<Health>;
  overview(): Promise<Overview>;
  integrations(): Promise<Integration[]>;
  testIntegration(id: IntegrationId): Promise<Integration>;
  listDomains(q: DomainQuery): Promise<Paged<Domain>>;
  allDomains(): Promise<Domain[]>;
  getDomain(name: string): Promise<Domain>;
  retryPreparation(name: string): Promise<Job>;
  nextNumber(): Promise<NextNumber>;
  quote(quantity: number): Promise<Quote>;
  startPurchase(domains: string[]): Promise<Job>;
  getJob(id: string): Promise<Job>;
  listJobs(): Promise<Job[]>;
  retryStage(id: string): Promise<Job>;
  verifyRegistration(id: string): Promise<Job>;
  skipItem(id: string): Promise<Job>;
  kumaStatus(): Promise<KumaStatus>;
  rotateNow(domain?: string): Promise<Job>;
  rotationHistory(): Promise<RotationRun[]>;
  listSchedules(): Promise<Schedule[]>;
  createSchedule(s: ScheduleInput): Promise<Schedule>;
  updateSchedule(id: string, patch: { state: "active" | "paused" }): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;
  activity(q: ActivityQuery): Promise<Activity[]>;
  conversations(): Promise<AiConversation[]>;
  conversation(id: string): Promise<AiConversation>;
  chat(conversationId: string | undefined, text: string, onEvent: (e: AiEvent) => void, signal?: AbortSignal): Promise<void>;
  aiAction(a: AiAction): Promise<{ ok: boolean; message: string; jobId?: string }>;
  settings(): Promise<Settings>;
  saveSettings<K extends SettingsSection>(section: K, values: Settings[K]): Promise<Settings>;
  saveSecrets(section: SettingsSection, secrets: Record<string, string>): Promise<Settings>;
}

/** Always resolves the adapter for the current mode at call time. */
export const api: Api = new Proxy({} as Api, {
  get(_t, prop: keyof Api) {
    const impl = getMode() === "live" ? httpApi : demoApi;
    const v = impl[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(impl) : v;
  },
});

export { ApiError } from "./http";
