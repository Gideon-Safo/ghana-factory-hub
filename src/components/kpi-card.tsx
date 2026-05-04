import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type Tone = "primary" | "success" | "warning" | "destructive" | "info";

const toneMap: Record<Tone, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
};

export function KpiCard({
  label, value, icon: Icon, tone = "primary", hint, backgroundImage,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  backgroundImage?: string;
}) {
  const hasBg = Boolean(backgroundImage);
  return (
    <Card
      className="relative overflow-hidden border-border bg-card p-5 bg-cover bg-center"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      {hasBg && <div className="absolute inset-0 bg-background/70" />}
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`rounded-lg bg-secondary p-2 ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-0.5 bg-${tone === "primary" ? "primary" : tone}/60`} />
    </Card>
  );
}
