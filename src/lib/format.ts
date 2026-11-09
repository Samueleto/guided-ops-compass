import { formatDistanceToNowStrict, format } from "date-fns";

export const rel = (iso?: string) => (iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : "—");
export const until = (iso?: string) => (iso ? `in ${formatDistanceToNowStrict(new Date(iso))}` : "—");
export const date = (iso?: string) => (iso ? format(new Date(iso), "MMM d, yyyy") : "—");
export const dateTime = (iso?: string) => (iso ? format(new Date(iso), "MMM d, HH:mm") : "—");
export const money = (n?: number, c = "USD") =>
  n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n);
export function elapsed(from?: string, to?: string) {
  if (!from) return "";
  const ms = (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime();
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}
