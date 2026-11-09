import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, Ban, Check, CheckCircle2, Crown, Loader2, Minus, PartyPopper, Plus, ShoppingCart, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Stepper, StepCard } from "@/components/app/wizard";
import { JobTracker } from "@/components/app/job-tracker";
import { DemoTag, ErrorState, PageHeader, Skel } from "@/components/app/ui";
import { api } from "@/lib/api";
import { useJob, useNextNumber, useOverview, useSettings } from "@/lib/queries";
import { clearState, loadState, saveState, useMode } from "@/lib/mode";
import { MAX_PRICE, MAX_QTY, MIN_QTY, clampQuantity, sequentialNames } from "@/lib/rules";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/buy")({
  head: () => ({
    meta: [
      { title: "Buy & Prepare — Domain Manager AI" },
      { name: "description", content: "Buy sequential .shop domains and prepare them on Cloudflare automatically." },
      { property: "og:title", content: "Buy & Prepare — Domain Manager AI" },
      { property: "og:description", content: "Buy sequential .shop domains and prepare them on Cloudflare automatically." },
    ],
  }),
  component: BuyWizard,
});

interface WState {
  step: number;
  quantity: number;
  selected: string[];
  jobId?: string;
}
const INIT: WState = { step: 0, quantity: 3, selected: [] };
const STEPS = ["Quantity", "Availability", "Purchase & prepare", "Done"];

function BuyWizard() {
  const mode = useMode();
  const [st, setSt] = useState<WState>(INIT);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setSt(loadState("buy-wizard", INIT));
    setReady(true);
  }, [mode]);
  useEffect(() => {
    if (ready) saveState("buy-wizard", st);
  }, [st, ready]);

  const job = useJob(st.jobId);
  useEffect(() => {
    if (st.step === 2 && job.data && (job.data.state === "completed" || job.data.state === "failed")) setSt((s) => ({ ...s, step: 3 }));
  }, [job.data, st.step]);

  const reset = () => {
    clearState("buy-wizard");
    setSt(INIT);
  };

  if (!ready) return <Skel className="h-96" />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Guided wizard" title="Buy & Prepare domains" description="Buy sequential .shop domains and get them READY automatically — one step at a time." />
      <Stepper steps={STEPS} current={st.step} />
      {st.step === 0 && <StepQuantity quantity={st.quantity} onChange={(q) => setSt((s) => ({ ...s, quantity: q }))} onNext={() => setSt((s) => ({ ...s, step: 1, selected: [] }))} />}
      {st.step === 1 && (
        <StepAvailability
          quantity={st.quantity}
          selected={st.selected}
          onSelect={(sel) => setSt((s) => ({ ...s, selected: sel }))}
          onBack={() => setSt((s) => ({ ...s, step: 0 }))}
          onStarted={(jobId) => setSt((s) => ({ ...s, jobId, step: 2 }))}
        />
      )}
      {st.step === 2 && (
        <StepCard stepKey="exec" title="Purchasing & preparing" description="Stay here or come back later — progress is saved and continues on the server.">
          {job.error ? <ErrorState error={job.error} onRetry={() => job.refetch()} /> : job.data ? <JobTracker job={job.data} /> : <Skel className="h-80" />}
        </StepCard>
      )}
      {st.step === 3 && job.data && (
        <StepCard
          stepKey="done"
          title=""
          footer={
            <>
              <Button variant="outline" onClick={reset}><Plus /> Prepare more domains</Button>
              <Button variant="premium" asChild>
                <Link to="/domains" search={{ status: "READY" }} onClick={reset}>View READY domains <ArrowRight /></Link>
              </Button>
            </>
          }
        >
          {(() => {
            const done = job.data.items.filter((i) => i.status === "done");
            const other = job.data.items.filter((i) => i.status !== "done");
            return (
              <div className="text-center">
                <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
                  <PartyPopper className="size-7 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-semibold">{done.length ? `${done.length} domain${done.length > 1 ? "s" : ""} READY` : "No domains were prepared"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {done.length ? "They're verified, connected to your Worker and waiting in the READY pool." : "Check the activity log or ask AI what went wrong."} <DemoTag />
                </p>
                <ul className="mx-auto mt-6 max-w-md space-y-2 text-left">
                  {done.map((i) => (
                    <li key={i.domain} className="flex items-center gap-3 rounded-lg border bg-success/6 px-3 py-2.5">
                      <CheckCircle2 className="size-4 text-success" />
                      <span className="flex-1 font-mono text-sm">{i.domain}</span>
                      <span className="text-xs font-semibold text-success">READY</span>
                    </li>
                  ))}
                  {other.map((i) => (
                    <li key={i.domain} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-muted-foreground">
                      <Ban className="size-4" />
                      <span className="flex-1 font-mono text-sm">{i.domain}</span>
                      <span className="text-xs font-semibold capitalize">{i.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </StepCard>
      )}
    </div>
  );
}

function StepQuantity({ quantity, onChange, onNext }: { quantity: number; onChange: (q: number) => void; onNext: () => void }) {
  const next = useNextNumber();
  const settings = useSettings();
  const ov = useOverview();
  const maxPrice = settings.data?.namecheap.maxPrice ?? MAX_PRICE;
  const budget = quantity * maxPrice;
  const balance = ov.data?.balance;
  const low = balance != null && balance < budget;
  const names = next.data ? sequentialNames(next.data.prefix, next.data.nextNumber, quantity) : [];

  return (
    <StepCard
      stepKey="qty"
      title="How many domains do you need?"
      description="We only buy sequential .shop domains costing $2.00 or less."
      footer={
        <>
          <p className="text-xs text-muted-foreground">Nothing is purchased until you confirm on the next step.</p>
          <Button variant="premium" onClick={onNext} disabled={!next.data}>
            Check availability <ArrowRight />
          </Button>
        </>
      }
    >
      <div className="grid gap-8 md:grid-cols-[1fr_280px]">
        <div>
          <div className="flex items-center justify-center gap-6 py-4">
            <Button size="icon" variant="outline" className="size-11 rounded-full" onClick={() => onChange(clampQuantity(quantity - 1))} disabled={quantity <= MIN_QTY} aria-label="Fewer">
              <Minus />
            </Button>
            <div className="text-center">
              <p className="font-display text-6xl font-semibold tabular-nums text-gradient">{quantity}</p>
              <p className="text-sm text-muted-foreground">domain{quantity > 1 ? "s" : ""}</p>
            </div>
            <Button size="icon" variant="outline" className="size-11 rounded-full" onClick={() => onChange(clampQuantity(quantity + 1))} disabled={quantity >= MAX_QTY} aria-label="More">
              <Plus />
            </Button>
          </div>
          <Slider value={[quantity]} min={MIN_QTY} max={MAX_QTY} step={1} onValueChange={([v]) => onChange(clampQuantity(v ?? 1))} className="mt-2" />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>1</span><span>10</span></div>

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Next names in sequence</p>
            {next.error ? (
              <ErrorState error={next.error} onRetry={() => next.refetch()} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {names.length ? names.map((n) => <span key={n} className="rounded-md border bg-elevated px-2 py-1 font-mono text-xs">{n}</span>) : <Skel className="h-7 w-full" />}
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">Unavailable or premium names are skipped automatically on the next step.</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border bg-elevated/40 p-4">
            <p className="text-xs text-muted-foreground">Maximum budget</p>
            <p className="font-display text-2xl font-semibold">{money(budget)}</p>
            <p className="text-xs text-muted-foreground">{quantity} × {money(maxPrice)} max</p>
          </div>
          <div className={cn("rounded-xl border p-4", low ? "border-destructive/40 bg-destructive/6" : "bg-elevated/40")}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="size-3.5" /> Namecheap balance <DemoTag /></div>
            <p className="font-display text-2xl font-semibold">{money(balance)}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", low ? "bg-destructive" : "bg-gradient-primary")} style={{ width: `${balance ? Math.min(100, (budget / balance) * 100) : 0}%` }} />
            </div>
            {low && <p className="mt-2 flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="size-3" /> Balance may not cover the maximum budget.</p>}
          </div>
          <div className="rounded-xl border p-4 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><Check className="size-3.5 text-success" /> .shop only</p>
            <p className="mt-1 flex items-center gap-2"><Check className="size-3.5 text-success" /> Sequential naming</p>
            <p className="mt-1 flex items-center gap-2"><Check className="size-3.5 text-success" /> Never re-buys a previous domain</p>
          </div>
        </div>
      </div>
    </StepCard>
  );
}

function StepAvailability({ quantity, selected, onSelect, onBack, onStarted }: { quantity: number; selected: string[]; onSelect: (s: string[]) => void; onBack: () => void; onStarted: (jobId: string) => void }) {
  const mode = useMode();
  const qc = useQueryClient();
  const [buying, setBuying] = useState(false);
  const quote = useQuery({ queryKey: [mode, "quote", quantity], queryFn: () => api.quote(quantity), staleTime: 60_000 });
  const eligible = useMemo(() => quote.data?.candidates.filter((c) => !c.excludedReason) ?? [], [quote.data]);

  useEffect(() => {
    if (quote.data && selected.length === 0) onSelect(eligible.slice(0, quantity).map((c) => c.domain));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.data]);

  const total = eligible.filter((c) => selected.includes(c.domain)).reduce((t, c) => t + (c.price ?? 0), 0);
  const toggle = (d: string) => onSelect(selected.includes(d) ? selected.filter((x) => x !== d) : selected.length < quantity ? [...selected, d] : selected);

  async function buy() {
    setBuying(true);
    try {
      const ordered = eligible.map((c) => c.domain).filter((d) => selected.includes(d));
      const job = await api.startPurchase(ordered);
      await qc.invalidateQueries();
      onStarted(job.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start purchase");
    } finally {
      setBuying(false);
    }
  }

  return (
    <StepCard
      stepKey="avail"
      title="Choose domains to buy"
      description={`Select up to ${quantity}. We checked live availability and pricing.`}
      footer={
        <>
          <Button variant="ghost" onClick={onBack}><ArrowLeft /> Back</Button>
          <div className="flex items-center gap-4">
            <p className="text-sm"><span className="text-muted-foreground">Total</span> <span className="font-semibold">{money(total)}</span></p>
            <Button variant="premium" onClick={buy} disabled={!selected.length || buying}>
              {buying ? <Loader2 className="animate-spin" /> : <ShoppingCart />} Buy {selected.length} domain{selected.length === 1 ? "" : "s"}
            </Button>
          </div>
        </>
      }
    >
      {quote.error ? (
        <ErrorState error={quote.error} onRetry={() => quote.refetch()} />
      ) : !quote.data ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: quantity + 1 }).map((_, i) => <Skel key={i} className="h-20" />)}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {quote.data.candidates.map((c) => {
            const on = selected.includes(c.domain);
            const off = !!c.excludedReason;
            return (
              <button
                key={c.domain}
                disabled={off}
                onClick={() => toggle(c.domain)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                  off ? "cursor-not-allowed opacity-55" : "hover:border-primary/50 hover:bg-accent/40",
                  on && "border-primary bg-primary/6 ring-2 ring-primary/20",
                )}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border transition-colors", on && "border-transparent bg-gradient-primary text-primary-foreground")}>
                  {on && <Check className="size-4" />}
                  {off && <Ban className="size-3.5 text-muted-foreground" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-semibold">{c.domain}</p>
                  <p className={cn("text-xs", off ? "text-destructive" : "text-success")}>{off ? c.excludedReason : "Available"}</p>
                </div>
                <div className="text-right">
                  {c.premium && <Crown className="ml-auto size-3.5 text-warning" />}
                  <p className="text-sm font-semibold">{money(c.price)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {quote.data && eligible.length < quantity && (
        <p className="mt-4 flex items-center gap-2 text-sm text-warning"><AlertTriangle className="size-4" /> Only {eligible.length} eligible domains found in this range.</p>
      )}
    </StepCard>
  );
}
