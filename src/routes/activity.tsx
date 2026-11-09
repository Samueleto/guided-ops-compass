import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityRow } from "@/components/app/activity-row";
import { Card, DemoTag, EmptyState, ErrorState, PageHeader, Skel } from "@/components/app/ui";
import { useActivity } from "@/lib/queries";
import type { ActivityStatus, ActivityType } from "@/lib/api/types";
import { format, isToday, isYesterday } from "date-fns";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Domain Manager AI" },
      { name: "description", content: "Searchable history of purchases, preparation, rotations, AI investigations and recoveries." },
      { property: "og:title", content: "Activity — Domain Manager AI" },
      { property: "og:description", content: "Searchable history of purchases, preparation, rotations, AI investigations and recoveries." },
    ],
  }),
  component: ActivityPage,
});

const TYPES: { v: ActivityType | "all"; l: string }[] = [
  { v: "all", l: "All types" }, { v: "purchase", l: "Purchases" }, { v: "preparation", l: "Preparation" }, { v: "worker", l: "Worker setup" }, { v: "verification", l: "Verification" }, { v: "rotation", l: "Rotations" }, { v: "schedule", l: "Schedules" }, { v: "ai", l: "AI investigations" }, { v: "recovery", l: "Recoveries" },
];
const STATUSES: { v: ActivityStatus | "all"; l: string }[] = [
  { v: "all", l: "Any status" }, { v: "success", l: "Success" }, { v: "error", l: "Failed" }, { v: "warning", l: "Warning" }, { v: "running", l: "Running" }, { v: "info", l: "Info" },
];
const RANGES = [{ v: "all", l: "All time" }, { v: "1", l: "Last 24 hours" }, { v: "7", l: "Last 7 days" }, { v: "30", l: "Last 30 days" }];

function ActivityPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<ActivityType | "all">("all");
  const [status, setStatus] = useState<ActivityStatus | "all">("all");
  const [range, setRange] = useState("all");
  const since = range === "all" ? undefined : new Date(Date.now() - Number(range) * 864e5).toISOString();
  const { data, error, refetch } = useActivity({ q: q || undefined, type, status, since });

  const groups = useMemo(() => {
    const m = new Map<string, NonNullable<typeof data>>();
    (data ?? []).forEach((a) => {
      const d = new Date(a.at);
      const k = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEEE, MMM d");
      m.set(k, [...(m.get(k) ?? []), a]);
    });
    return [...m.entries()];
  }, [data]);

  return (
    <div>
      <PageHeader eyebrow="History" title="Activity" description="Everything that happened, in plain language. Click an entry for details." actions={<DemoTag className="self-center" />} />
      <div className="mb-5 grid gap-2 md:grid-cols-[1fr_180px_160px_160px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity…" className="pl-9" />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as ActivityType | "all")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={(v) => setStatus(v as ActivityStatus | "all")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent></Select>
        <Select value={range} onValueChange={setRange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RANGES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent></Select>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data ? (
        <Skel className="h-96" />
      ) : data.length === 0 ? (
        <EmptyState icon={History} title="No activity found" body="Try clearing filters." />
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day}</p>
              <Card className="divide-y py-1">{items.map((a) => <ActivityRow key={a.id} a={a} />)}</Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
