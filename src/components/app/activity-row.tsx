import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bot, CheckCircle2, ChevronDown, Globe2, Info, Loader2, RefreshCcw, ShoppingCart, Wrench, XCircle } from "lucide-react";
import type { Activity } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { rel, dateTime } from "@/lib/format";

const TYPE_ICON = { purchase: ShoppingCart, preparation: Globe2, worker: Wrench, verification: CheckCircle2, rotation: RefreshCcw, schedule: RefreshCcw, ai: Bot, recovery: Wrench, system: Info };
const STATUS = {
  success: { icon: CheckCircle2, cls: "text-success bg-success/12" },
  error: { icon: XCircle, cls: "text-destructive bg-destructive/12" },
  warning: { icon: AlertTriangle, cls: "text-warning bg-warning/12" },
  info: { icon: Info, cls: "text-info bg-info/12" },
  running: { icon: Loader2, cls: "text-primary bg-primary/12" },
};

export function ActivityRow({ a, compact }: { a: Activity; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const T = TYPE_ICON[a.type] ?? Info;
  const s = STATUS[a.status];
  const expandable = !compact && (a.explanation || a.steps?.length || a.details);
  return (
    <div className="py-3">
      <button className={cn("flex w-full items-start gap-3 text-left", !expandable && "cursor-default")} onClick={() => expandable && setOpen((o) => !o)}>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", s.cls)}>
          <T className={cn("size-4", a.status === "running" && "animate-pulse")} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{a.title}</p>
          <p className={cn("text-xs text-muted-foreground", compact && "truncate")}>{a.summary}</p>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground" title={dateTime(a.at)}>{rel(a.at)}</span>
        {expandable && <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />}
      </button>
      {open && (
        <div className="animate-step ml-11 mt-3 space-y-3 rounded-lg border bg-elevated/40 p-3">
          {a.explanation && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">What happened</p>
              <p className="mt-0.5 text-sm">{a.explanation}</p>
            </div>
          )}
          {a.steps && (
            <ol className="space-y-1">
              {a.steps.map((st, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className={cn("size-1.5 rounded-full", st.status === "done" ? "bg-success" : st.status === "attention" || st.status === "failed" ? "bg-destructive" : "bg-muted-foreground")} />
                  {st.label}
                </li>
              ))}
            </ol>
          )}
          {a.details && (
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">Technical details</summary>
              <pre className="mt-2 overflow-auto rounded bg-muted p-2 font-mono text-[11px]">{JSON.stringify(a.details, null, 2)}</pre>
            </details>
          )}
          <div className="flex gap-3 text-xs">
            {a.domain && <Link to="/domains/$name" params={{ name: a.domain }} className="font-medium text-primary hover:underline">Open {a.domain}</Link>}
            {a.status === "error" && <Link to="/ai" search={{ q: `Explain: ${a.title}` }} className="font-medium text-primary hover:underline">Ask AI</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
