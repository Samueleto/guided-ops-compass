import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex flex-1 items-center gap-2 last:flex-none">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-all duration-300",
                  done && "border-transparent bg-gradient-primary text-primary-foreground",
                  active && "border-primary bg-primary/10 text-primary ring-4 ring-primary/15",
                  !done && !active && "bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn("hidden text-sm font-medium md:inline", active ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="relative h-px flex-1 bg-border">
                <div className="absolute inset-y-0 left-0 bg-gradient-primary transition-all duration-500" style={{ width: done ? "100%" : "0%" }} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function StepCard({ stepKey, title, description, children, footer }: { stepKey: string | number; title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div key={stepKey} className="surface animate-step overflow-hidden">
      <div className="border-b px-5 py-5 sm:px-7">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="px-5 py-6 sm:px-7">{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-elevated/40 px-5 py-4 sm:px-7">{footer}</div>}
    </div>
  );
}
