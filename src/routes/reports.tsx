import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

type Report = {
  daily: { date: string; produced: number; defects: number; rework: number; eff: number }[];
  weekly: { week: string; produced: number; defects: number; eff: number }[];
  monthly: { month: string; revenue: number; units: number; cost: number; profit: number }[];
  defects: { type: string; count: number }[];
};

function ReportsPage() {
  const [r, setR] = useState<Report | null>(null);

  useEffect(() => { load().then(setR); }, []);

  if (!r) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Daily, weekly and monthly summaries." />

      <Section
        title="Daily production (last 14 days)"
        rows={r.daily}
        cols={["Date","Produced","Defects","Rework","Eff %"]}
        render={(d) => [d.date, d.produced, d.defects, d.rework, `${d.eff.toFixed(1)}%`]}
      />
      <Section
        title="Weekly efficiency (last 8 weeks)"
        rows={r.weekly}
        cols={["Week","Produced","Defects","Efficiency %"]}
        render={(w) => [w.week, w.produced, w.defects, `${w.eff.toFixed(1)}%`]}
      />
      <Section
        title="Monthly profit (last 6 months)"
        rows={r.monthly}
        cols={["Month","Units sold","Revenue (₵)","Est. cost (₵)","Est. profit (₵)"]}
        render={(m) => [m.month, m.units, m.revenue.toLocaleString(), m.cost.toLocaleString(), m.profit.toLocaleString()]}
      />
      <Section
        title="Defect analysis"
        rows={r.defects}
        cols={["Fault type","Count"]}
        render={(d) => [d.type, d.count]}
      />
    </div>
  );
}

function Section<T>({ title, rows, cols, render }: { title: string; rows: T[]; cols: string[]; render: (r: T) => (string | number)[] }) {
  function exportCsv() {
    const lines = [cols.join(",")];
    for (const r of rows) lines.push(render(r).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${title.toLowerCase().replace(/[^a-z]+/g, "-")}.csv`; a.click();
  }
  return (
    <Card className="border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <Button variant="ghost" size="sm" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </div>
      <Table>
        <TableHeader><TableRow>{cols.map(c => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {render(row).map((c, j) => <TableCell key={j}>{c}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

async function load(): Promise<Report> {
  const sixMonths = new Date(); sixMonths.setMonth(sixMonths.getMonth() - 6);
  const eightWeeks = new Date(); eightWeeks.setDate(eightWeeks.getDate() - 56);
  const fortnight = new Date(); fortnight.setDate(fortnight.getDate() - 14);

  const [{ data: runs }, { data: sales }, { data: faults }, { data: comps }] = await Promise.all([
    supabase.from("production_runs").select("run_date,planned_qty,actual_qty,defects_qty,rework_qty").gte("run_date", eightWeeks.toISOString().slice(0,10)),
    supabase.from("sales").select("sale_date,units_sold,revenue").gte("sale_date", sixMonths.toISOString().slice(0,10)),
    supabase.from("fault_records").select("fault_type"),
    supabase.from("components").select("unit_cost,current_stock"),
  ]);

  // daily (14d)
  const daily: Report["daily"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0,10);
    const day = (runs ?? []).filter(r => r.run_date === k);
    const produced = day.reduce((s, r) => s + r.actual_qty, 0);
    const planned = day.reduce((s, r) => s + r.planned_qty, 0);
    daily.push({
      date: k,
      produced,
      defects: day.reduce((s, r) => s + r.defects_qty, 0),
      rework: day.reduce((s, r) => s + r.rework_qty, 0),
      eff: planned ? (produced / planned) * 100 : 0,
    });
  }

  // weekly (8 wks)
  const weekly: Report["weekly"] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(); start.setDate(start.getDate() - (i * 7 + 6));
    const end = new Date(); end.setDate(end.getDate() - i * 7);
    const ws = start.toISOString().slice(0,10), we = end.toISOString().slice(0,10);
    const wk = (runs ?? []).filter(r => r.run_date >= ws && r.run_date <= we);
    const produced = wk.reduce((s, r) => s + r.actual_qty, 0);
    const planned = wk.reduce((s, r) => s + r.planned_qty, 0);
    weekly.push({ week: ws, produced, defects: wk.reduce((s, r) => s + r.defects_qty, 0), eff: planned ? (produced / planned) * 100 : 0 });
  }

  // monthly profit
  const monthly: Report["monthly"] = [];
  const avgUnitCost = comps && comps.length ? comps.reduce((s, c) => s + Number(c.unit_cost), 0) / comps.length * 5 : 600; // rough avg per TV
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const ms = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const m = (sales ?? []).filter(s => s.sale_date.startsWith(ms));
    const units = m.reduce((s, x) => s + x.units_sold, 0);
    const revenue = m.reduce((s, x) => s + Number(x.revenue), 0);
    const cost = units * avgUnitCost;
    monthly.push({ month: ms, units, revenue, cost, profit: revenue - cost });
  }

  // defects
  const fcount = new Map<string, number>();
  for (const f of faults ?? []) fcount.set(f.fault_type, (fcount.get(f.fault_type) ?? 0) + 1);
  const defects = Array.from(fcount, ([type, count]) => ({ type, count }));

  return { daily, weekly, monthly, defects };
}
