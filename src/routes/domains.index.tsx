import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, ChevronLeft, ChevronRight, LayoutGrid, Lock, RefreshCcw, RotateCcw, Search, ShieldCheck, Sparkles, Table2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, PageHeader, Skel, STATUS_LIST, StatusBadge, statusLabel, DemoTag } from "@/components/app/ui";
import { useDomains, useOverview } from "@/lib/queries";
import { api } from "@/lib/api";
import type { Domain, DomainStatus } from "@/lib/api/types";
import { date } from "@/lib/format";
import { isRotatable } from "@/lib/rules";
import { cn } from "@/lib/utils";

type Search = { status?: DomainStatus; q?: string; page?: number };

export const Route = createFileRoute("/domains/")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof s["status"] === "string" && (STATUS_LIST as string[]).includes(s["status"])) out.status = s["status"] as DomainStatus;
    if (typeof s["q"] === "string" && s["q"]) out.q = s["q"];
    const p = Number(s["page"]);
    if (p > 1) out.page = p;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Domains — Domain Manager AI" },
      { name: "description", content: "Search and manage your domain inventory: READY, preparing, in use and used." },
      { property: "og:title", content: "Domains — Domain Manager AI" },
      { property: "og:description", content: "Search and manage your domain inventory: READY, preparing, in use and used." },
    ],
  }),
  component: Inventory,
});

const PAGE = 12;

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px]", ok ? "text-success" : "text-muted-foreground")}>
      <span className={cn("size-1.5 rounded-full", ok ? "bg-success" : "bg-muted-foreground/50")} /> {label}
    </span>
  );
}

function DomainActions({ d }: { d: Domain }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="outline" asChild>
        <Link to="/domains/$name" params={{ name: d.name }}>Details</Link>
      </Button>
      {(d.status === "ACTION_REQUIRED" || d.status === "FAILED") && d.lastError?.retrySafe !== false && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.retryPreparation(d.name);
              toast.success(`Retrying ${d.name}`);
              await qc.invalidateQueries();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Retry failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <RotateCcw /> Retry
        </Button>
      )}
      {isRotatable(d) && (
        <Button size="sm" variant="outline" asChild>
          <Link to="/rotation" search={{ domain: d.name }}><RefreshCcw /> Rotate</Link>
        </Button>
      )}
      {(d.status === "ACTION_REQUIRED" || d.status === "FAILED" || d.status === "WAITING") && (
        <Button size="sm" variant="ghost" asChild>
          <Link to="/ai" search={{ q: `Why is ${d.name} not READY?` }}><Sparkles /> Ask AI</Link>
        </Button>
      )}
    </div>
  );
}

function DomainCard({ d }: { d: Domain }) {
  const locked = !!d.usedAt;
  return (
    <div className="surface flex flex-col gap-4 p-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to="/domains/$name" params={{ name: d.name }} className="block truncate font-mono text-[15px] font-semibold hover:text-primary">{d.name}</Link>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><CalendarClock className="size-3" /> {date(d.registeredAt)} → {date(d.expiresAt)}</p>
        </div>
        <StatusBadge status={d.status} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <Check ok={d.zoneActive} label="Zone" />
        <Check ok={d.sslActive} label="SSL" />
        <Check ok={d.workerAttached} label="Worker" />
        <Check ok={d.verified} label="Verified" />
      </div>
      {d.lastError && (d.status === "ACTION_REQUIRED" || d.status === "FAILED") && <p className="rounded-lg bg-destructive/8 px-2.5 py-1.5 text-xs text-destructive">{d.lastError.message}</p>}
      {locked && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" /> Used {d.usageHistory.length}× · first {date(d.usedAt)} · can't be rotated again
        </p>
      )}
      <div className="mt-auto"><DomainActions d={d} /></div>
    </div>
  );
}

function Inventory() {
  const search = Route.useSearch();
  const nav = useNavigate({ from: "/domains/" });
  const [view, setView] = useState<"grid" | "table">("grid");
  const [q, setQ] = useState(search.q ?? "");
  const page = search.page ?? 1;
  const { data, isLoading, error, refetch } = useDomains({ status: search.status ?? "all", q: search.q, page, pageSize: PAGE });
  const ov = useOverview();
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;
  const set = (patch: Search) => nav({ search: (p: Search) => ({ ...p, page: undefined, ...patch }) });

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Domains"
        description="Every domain you've bought, its preparation status and usage history."
        actions={<Button variant="premium" asChild><Link to="/buy">Buy domains</Link></Button>}
      />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <form className="relative flex-1" onSubmit={(e) => { e.preventDefault(); set({ q: q || undefined }); }}>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => set({ q: q || undefined })} placeholder="Search domains…" className="pl-9" />
        </form>
        <div className="flex rounded-lg border p-0.5">
          <Button size="sm" variant={view === "grid" ? "secondary" : "ghost"} onClick={() => setView("grid")} aria-label="Grid view"><LayoutGrid /></Button>
          <Button size="sm" variant={view === "table" ? "secondary" : "ghost"} onClick={() => setView("table")} aria-label="Table view"><Table2 /></Button>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        <button onClick={() => set({ status: undefined })} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", !search.status ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent")}>
          All {ov.data && <span className="ml-1 opacity-60">{ov.data.total}</span>}
        </button>
        {STATUS_LIST.map((s) => (
          <button key={s} onClick={() => set({ status: s })} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", search.status === s ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent")}>
            {statusLabel(s)} {ov.data && <span className="ml-1 opacity-60">{ov.data.counts[s]}</span>}
          </button>
        ))}
        <DemoTag className="ml-auto self-center" />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-44" />)}</div>
      ) : data.items.length === 0 ? (
        <EmptyState icon={Workflow} title="No domains match" body="Try a different filter, or buy new domains." action={<Button variant="outline" asChild><Link to="/buy">Buy domains</Link></Button>} />
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((d) => <DomainCard key={d.name} d={d} />)}</div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">Domain</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Registered</th><th className="px-4 py-3 font-medium">Expires</th><th className="px-4 py-3 font-medium">Worker</th><th className="px-4 py-3 font-medium">Used</th><th /></tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((d) => (
                <tr key={d.name} className="hover:bg-accent/30">
                  <td className="px-4 py-3 font-mono font-medium"><Link to="/domains/$name" params={{ name: d.name }} className="hover:text-primary">{d.name}</Link></td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{date(d.registeredAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{date(d.expiresAt)}</td>
                  <td className="px-4 py-3">{d.workerAttached ? <ShieldCheck className="size-4 text-success" /> : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.usedAt ? <span className="inline-flex items-center gap-1"><Lock className="size-3" /> {date(d.usedAt)}</span> : "Never"}</td>
                  <td className="px-4 py-3 text-right"><DomainActions d={d} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => nav({ search: (p: Search) => ({ ...p, page: page - 1 > 1 ? page - 1 : undefined }) })}><ChevronLeft /> Prev</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => nav({ search: (p: Search) => ({ ...p, page: page + 1 }) })}>Next <ChevronRight /></Button>
        </div>
      )}
    </div>
  );
}
