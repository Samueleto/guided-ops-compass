import { useSyncExternalStore } from "react";

export type Mode = "demo" | "live";
const MODE_KEY = "dm-mode";
const BASE_KEY = "dm-dev-api-base";
const listeners = new Set<() => void>();

const isBrowser = () => typeof window !== "undefined";

export function getMode(): Mode {
  if (!isBrowser()) return "demo";
  const v = localStorage.getItem(MODE_KEY);
  if (v === "live" || v === "demo") return v;
  return import.meta.env["VITE_DEFAULT_MODE"] === "live" ? "live" : "demo";
}

export function setMode(m: Mode) {
  localStorage.setItem(MODE_KEY, m);
  listeners.forEach((l) => l());
}

/** Production uses same-origin /api. A different base can be set only in development. */
export function getApiBase(): string {
  if (import.meta.env.DEV && isBrowser()) {
    const v = localStorage.getItem(BASE_KEY);
    if (v) return v;
  }
  return import.meta.env["VITE_API_BASE_URL"] || "/api";
}

export function setDevApiBase(v: string) {
  if (!import.meta.env.DEV) return;
  if (v) localStorage.setItem(BASE_KEY, v);
  else localStorage.removeItem(BASE_KEY);
  listeners.forEach((l) => l());
}

export function useMode(): Mode {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getMode,
    () => "demo",
  );
}

/** Mode-scoped localStorage for wizard progress (job IDs and step only — never secrets). */
export function loadState<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(`dm-${getMode()}-${key}`);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
export function saveState(key: string, v: unknown) {
  localStorage.setItem(`dm-${getMode()}-${key}`, JSON.stringify(v));
}
export function clearState(key: string) {
  localStorage.removeItem(`dm-${getMode()}-${key}`);
}
