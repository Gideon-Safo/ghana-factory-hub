import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/reveal";
import { Tv, Factory, ShieldCheck, Package, Banknote, AlertTriangle, Wrench } from "lucide-react";
import kpiUnits from "@/assets/kpi-units.jpg";
import kpiQc from "@/assets/kpi-qc.jpg";
import kpiDefect from "@/assets/kpi-defect.jpg";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/")({ component: Dashboard });

type Metrics = {
  todayUnits: number; weekUnits: number; monthUnits: number;
  defectRate: number; qcPassRate: number; reworkRate: number;
  inventoryValue: number; revenue: number;
  lowStock: number;
  byDay: { date: string; produced: number; defects: number }[];
  byModel: { name: string; units: number }[];
  qcSplit: { name: string; value: number }[];
  alerts: { kind: string; message: string }[];
};

function Dashboard() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => { load().then(setM); }, []);

  if (!m) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const COLORS = ["oklch(0.7 0.18 150)", "oklch(0.65 0.22 25)"];

  return (
    <div className="space-y-6">
      <div className="float-in">
        <PageHeader title="Factory Control Center" description="Real-time production, quality, and sales overview." />
      </div>

      {m.alerts.length > 0 && (
        <Card className="float-in border-warning/40 bg-warning/5 p-4" style={{ animationDelay: "80ms" }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-warning">{m.alerts.length} active alerts</p>
              {m.alerts.slice(0, 3).map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {a.message}</p>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          <KpiCard key="a" label="Units today" value={m.todayUnits} icon={Tv} tone="primary" hint={`${m.weekUnits} this week`} backgroundImage={kpiUnits} />,
          <KpiCard key="b" label="QC pass rate" value={`${m.qcPassRate.toFixed(1)}%`} icon={ShieldCheck} tone="success" backgroundImage={kpiQc} />,
          <KpiCard key="c" label="Defect rate" value={`${m.defectRate.toFixed(1)}%`} icon={Wrench} tone="destructive" hint={`Rework ${m.reworkRate.toFixed(1)}%`} backgroundImage={kpiDefect} />,
          <KpiCard key="d" label="Revenue (₵)" value={fmt(m.revenue)} icon={DollarSign} tone="info" hint="Last 14 days" />,
          <KpiCard key="e" label="Units this month" value={m.monthUnits} icon={Factory} tone="primary" />,
          <KpiCard key="f" label="Inventory value (₵)" value={fmt(m.inventoryValue)} icon={Package} tone="info" />,
          <KpiCard key="g" label="Low stock items" value={m.lowStock} icon={AlertTriangle} tone="warning" />,
          <KpiCard key="h" label="Rework rate" value={`${m.reworkRate.toFixed(1)}%`} icon={Wrench} tone="warning" />,
        ].map((node, i) => (
          <div key={i} className="float-in" style={{ animationDelay: `${120 + i * 60}ms` }}>{node}</div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card className="border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Production · last 14 days</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={m.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.02 250)" />
                <XAxis dataKey="date" stroke="oklch(0.7 0.02 250)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.02 250)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.32 0.02 250)", borderRadius: 6 }} />
                <Legend />
                <Line type="monotone" dataKey="produced" stroke="oklch(0.78 0.18 75)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="defects" stroke="oklch(0.65 0.22 25)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Reveal>

        <Reveal delay={100}>
          <Card className="border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">QC results</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={m.qcSplit} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {m.qcSplit.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.32 0.02 250)", borderRadius: 6 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-3" delay={150}>
          <Card className="border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Output by model</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={m.byModel}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.02 250)" />
                <XAxis dataKey="name" stroke="oklch(0.7 0.02 250)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.02 250)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.32 0.02 250)", borderRadius: 6 }} />
                <Bar dataKey="units" fill="oklch(0.72 0.16 220)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-GH", { maximumFractionDigits: 0 }).format(n);
}

async function load(): Promise<Metrics> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const fortnightAgo = new Date(today); fortnightAgo.setDate(fortnightAgo.getDate() - 14);

  const [{ data: runs }, { data: qc }, { data: comps }, { data: sales }, { data: models }] = await Promise.all([
    supabase.from("production_runs").select("run_date,actual_qty,defects_qty,rework_qty,model_id").gte("run_date", fortnightAgo.toISOString().slice(0, 10)),
    supabase.from("qc_inspections").select("final_result"),
    supabase.from("components").select("current_stock,unit_cost,reorder_level,name"),
    supabase.from("sales").select("revenue,sale_date").gte("sale_date", fortnightAgo.toISOString().slice(0, 10)),
    supabase.from("tv_models").select("id,name"),
  ]);

  const todayStr = today.toISOString().slice(0, 10);
  const weekStr = weekAgo.toISOString().slice(0, 10);
  const monthStr = monthStart.toISOString().slice(0, 10);

  let todayUnits = 0, weekUnits = 0, monthUnits = 0, totalActual = 0, totalDefect = 0, totalRework = 0;
  for (const r of runs ?? []) {
    if (r.run_date >= todayStr) todayUnits += r.actual_qty;
    if (r.run_date >= weekStr) weekUnits += r.actual_qty;
    if (r.run_date >= monthStr) monthUnits += r.actual_qty;
    totalActual += r.actual_qty; totalDefect += r.defects_qty; totalRework += r.rework_qty;
  }
  const defectRate = totalActual ? (totalDefect / totalActual) * 100 : 0;
  const reworkRate = totalActual ? (totalRework / totalActual) * 100 : 0;

  const qcPass = (qc ?? []).filter((q) => q.final_result === "PASS").length;
  const qcFail = (qc ?? []).filter((q) => q.final_result === "FAIL").length;
  const qcPassRate = qcPass + qcFail ? (qcPass / (qcPass + qcFail)) * 100 : 0;

  const inventoryValue = (comps ?? []).reduce((s, c) => s + c.current_stock * Number(c.unit_cost), 0);
  const lowStock = (comps ?? []).filter((c) => c.current_stock <= c.reorder_level).length;
  const revenue = (sales ?? []).reduce((s, x) => s + Number(x.revenue ?? 0), 0);

  // by day
  const dayMap = new Map<string, { produced: number; defects: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    dayMap.set(d.toISOString().slice(5, 10), { produced: 0, defects: 0 });
  }
  for (const r of runs ?? []) {
    const k = r.run_date.slice(5, 10);
    const cur = dayMap.get(k);
    if (cur) { cur.produced += r.actual_qty; cur.defects += r.defects_qty; }
  }
  const byDay = Array.from(dayMap, ([date, v]) => ({ date, ...v }));

  // by model
  const modelName = new Map((models ?? []).map((mm) => [mm.id, mm.name]));
  const modelMap = new Map<string, number>();
  for (const r of runs ?? []) {
    const n = modelName.get(r.model_id) ?? "Unknown";
    modelMap.set(n, (modelMap.get(n) ?? 0) + r.actual_qty);
  }
  const byModel = Array.from(modelMap, ([name, units]) => ({ name, units }));

  const alerts: Metrics["alerts"] = [];
  for (const c of comps ?? []) {
    if (c.current_stock <= c.reorder_level)
      alerts.push({ kind: "stock", message: `${c.name}: ${c.current_stock} units (reorder at ${c.reorder_level})` });
  }
  if (defectRate > 5) alerts.push({ kind: "quality", message: `Defect rate ${defectRate.toFixed(1)}% exceeds 5% threshold` });

  return {
    todayUnits, weekUnits, monthUnits,
    defectRate, qcPassRate, reworkRate,
    inventoryValue, revenue, lowStock,
    byDay, byModel,
    qcSplit: [{ name: "PASS", value: qcPass }, { name: "FAIL", value: qcFail }],
    alerts,
  };
}
