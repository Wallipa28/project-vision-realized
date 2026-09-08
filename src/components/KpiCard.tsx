import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  icon?: ReactNode;
}) {
  const toneClass = {
    neutral: "text-foreground",
    good: "text-success",
    warn: "text-warning",
    bad: "text-destructive",
  }[tone];

  return (
    <div className="panel p-6">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-primary">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={cn("num mt-3 font-mono text-2xl", toneClass)}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
