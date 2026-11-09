import type { Candidate, Domain, ScheduleInput } from "./api/types";

export const TLD = ".shop" as const;
export const MAX_PRICE = 2;
export const MIN_QTY = 1;
export const MAX_QTY = 10;
export const LANDING_PATH = "/adultp/" as const;

export function clampQuantity(n: number) {
  if (!Number.isFinite(n)) return MIN_QTY;
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(n)));
}

export function sequentialNames(prefix: string, start: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${start + i}${TLD}`);
}

/** Returns why a candidate cannot be purchased, or null if it is eligible. */
export function exclusionReason(c: Candidate, owned: Set<string>, maxPrice = MAX_PRICE): string | null {
  if (!c.domain.endsWith(TLD)) return "Only .shop domains are allowed";
  if (owned.has(c.domain)) return "Already purchased before";
  if (!c.available) return "Not available";
  if (c.premium) return "Premium domain";
  if (c.price == null) return "Price unknown";
  if (c.price > maxPrice) return `Over $${maxPrice.toFixed(2)} limit`;
  return null;
}

export function landingUrl(domain: string) {
  return `https://${domain}${LANDING_PATH}`;
}

export function domainNumber(name: string) {
  const m = name.match(/(\d+)\.shop$/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/** A domain can be rotated into Kuma only if READY and never activated before. */
export function isRotatable(d: Domain) {
  return d.status === "READY" && !d.usedAt;
}

export function pickNextDomain(domains: Domain[], preferred?: string): Domain | undefined {
  const eligible = domains.filter(isRotatable).sort((a, b) => domainNumber(a.name) - domainNumber(b.name));
  if (preferred) {
    const p = eligible.find((d) => d.name === preferred);
    if (p) return p;
  }
  return eligible[0];
}

// ---------- Schedules ----------

/** Offset (ms) of `tz` from UTC at instant `d`. */
function tzOffset(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/** Wall-clock parts of instant `d` in `tz`. */
function wall(d: Date, tz: string) {
  const local = new Date(d.getTime() + tzOffset(d, tz));
  return { y: local.getUTCFullYear(), m: local.getUTCMonth(), day: local.getUTCDate(), wd: local.getUTCDay() };
}

/** Instant for wall-clock time in `tz`. */
function fromWall(y: number, m: number, day: number, hh: number, mm: number, tz: string) {
  const guess = Date.UTC(y, m, day, hh, mm);
  const off = tzOffset(new Date(guess), tz);
  return new Date(guess - off);
}

export function nextRuns(s: ScheduleInput, from: Date, count = 3): Date[] {
  const out: Date[] = [];
  if (s.mode === "interval") {
    const step = Math.max(5, s.intervalMinutes ?? 60) * 60_000;
    for (let i = 1; i <= count; i++) out.push(new Date(from.getTime() + step * i));
    return out;
  }
  const [hh, mm] = (s.time ?? "09:00").split(":").map(Number);
  const w = wall(from, s.timezone);
  for (let offset = 0; out.length < count && offset < 400; offset++) {
    const base = new Date(Date.UTC(w.y, w.m, w.day + offset));
    const cand = fromWall(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hh, mm, s.timezone);
    if (cand <= from) continue;
    if (s.mode === "weekly" && base.getUTCDay() !== (s.weekday ?? 1)) continue;
    out.push(cand);
  }
  return out;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function describeSchedule(s: ScheduleInput) {
  if (s.mode === "interval") {
    const m = s.intervalMinutes ?? 60;
    if (m % 60 === 0) return m === 60 ? "Every hour" : `Every ${m / 60} hours`;
    return `Every ${m} minutes`;
  }
  if (s.mode === "daily") return `Every day at ${s.time ?? "09:00"}`;
  return `Every ${WEEKDAYS[s.weekday ?? 1]} at ${s.time ?? "09:00"}`;
}
