import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, Lock, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, DemoTag, ErrorState, PageHeader, Skel, StatusBadge } from "@/components/app/ui";
import { ActivityRow } from "@/components/app/activity-row";
import { useActivity, useDomain } from "@/lib/queries";
import { date, dateTime, money } from "@/lib/format";
import { isRotatable, landingUrl } from "@/lib/rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/domains/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.name} — Domain Manager AI` },
      { name: "description", content: `Preparation, verification and usage history for ${params.name}.` },
      { property: "og:title", content: `${params.name} — Domain Manager AI` },
      { property: "og:description", content: `Preparation, verification and usage history for ${params.name}.` },
    ],
  }),
  component: DomainDetail,
});

function DomainDetail() {
  const { name } = Route.useParams();
  const { data: d, error, refetch } = useDomain(name);
  const { data: activity } = useActivity({ q: name });

  const checks = d
    ? [
        { label: "Registered with Namecheap", ok: !!d.registeredAt },
        { label: "Cloudflare zone active", ok: d.zoneActive },
        { label: "SSL configured", ok: d.sslActive },
        { label: "Worker attached", ok: d.workerAttached },
        { label: "Landing URL verified", ok: d.verified },
      ]
    : [];

  return (
    <div>
      <Link to="/domains" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All domains</Link>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !d ? (
        <Skel className="h-80" />
      ) : (
        <>
          <PageHeader
            title={d.name}
            description={landingUrl(d.name)}
            actions={
              <>
                <StatusBadge status={d.status} className="self-center" />
                <DemoTag className="self-center" />
                {isRotatable(d) && <Button variant="premium" asChild><Link to="/rotation" search={{ domain: d.name }}><RefreshCcw /> Use for rotation</Link></Button>}
                <Button variant="outline" asChild><Link to="/ai" search={{ q: `Check ${d.name}` }}><Sparkles /> Ask AI</Link></Button>
              </>
            }
          />
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <h3 className="mb-4 font-semibold">Preparation checks</h3>
              <ul className="space-y-3">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-center gap-3 text-sm">
                    {c.ok ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}
                    <span className={cn(!c.ok && "text-muted-foreground")}>{c.label}</span>
                  </li>
                ))}
              </ul>
              {d.lastError && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/6 p-3">
                  <p className="text-sm font-medium">{d.lastError.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{d.lastError.explanation}</p>
                </div>
              )}
            </Card>
            <Card>
              <h3 className="mb-4 font-semibold">Details</h3>
              <dl className="grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Registered</dt><dd>{date(d.registeredAt)}</dd>
                <dt className="text-muted-foreground">Expires</dt><dd>{date(d.expiresAt)}</dd>
                <dt className="text-muted-foreground">Price</dt><dd>{money(d.price)}</dd>
                <dt className="text-muted-foreground">Landing</dt>
                <dd><a href={landingUrl(d.name)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Open <ExternalLink className="size-3" /></a></dd>
              </dl>
            </Card>
            <Card>
              <h3 className="mb-4 font-semibold">Usage history</h3>
              {d.usedAt && <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground"><Lock className="size-3" /> Permanently marked used — never rotated again.</p>}
              {d.usageHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Never activated in Kuma.</p>
              ) : (
                <ul className="space-y-2">
                  {d.usageHistory.map((u, i) => (
                    <li key={i} className="rounded-lg border p-2.5 text-xs">
                      <p className="font-medium">Activated {dateTime(u.activatedAt)} <span className="text-muted-foreground">({u.trigger})</span></p>
                      <p className="text-muted-foreground">{u.deactivatedAt ? `Replaced ${dateTime(u.deactivatedAt)}` : "Currently active"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <Card className="mt-6">
            <h3 className="mb-2 font-semibold">Related activity</h3>
            <div className="divide-y">
              {(activity ?? []).map((a) => <ActivityRow key={a.id} a={a} />)}
              {activity?.length === 0 && <p className="py-4 text-sm text-muted-foreground">No activity yet.</p>}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
