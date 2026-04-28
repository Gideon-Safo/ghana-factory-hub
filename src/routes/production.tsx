import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/production")({ component: ProductionPage });

type Run = {
  id: string; run_date: string; shift: string;
  model_id: string; planned_qty: number; actual_qty: number;
  defects_qty: number; rework_qty: number; supervisor: string | null;
  tv_models?: { name: string } | null;
};

function ProductionPage() {
  const { hasAny } = useAuth();
  const canEdit = hasAny(["admin", "production"]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    run_date: new Date().toISOString().slice(0, 10),
    shift: "Morning", model_id: "", planned_qty: 100, actual_qty: 0,
    defects_qty: 0, rework_qty: 0, supervisor: "",
  });

  useEffect(() => { load(); supabase.from("tv_models").select("id,name").order("name").then(({ data }) => setModels(data ?? [])); }, []);

  async function load() {
    const { data } = await supabase.from("production_runs")
      .select("*, tv_models(name)").order("run_date", { ascending: false }).order("created_at", { ascending: false }).limit(100);
    setRuns((data as Run[]) ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.model_id) return toast.error("Select a model");
    const { error } = await supabase.from("production_runs").insert({
      ...form,
      planned_qty: Number(form.planned_qty), actual_qty: Number(form.actual_qty),
      defects_qty: Number(form.defects_qty), rework_qty: Number(form.rework_qty),
      shift: form.shift as "Morning" | "Afternoon" | "Night",
    });
    if (error) return toast.error(error.message);
    toast.success("Production run added — stock auto-deducted");
    setOpen(false); load();
  }

  function exportCsv() {
    const rows = [["Date","Shift","Model","Planned","Actual","Defects","Rework","Eff%","Supervisor"]];
    for (const r of runs) {
      const eff = r.planned_qty ? ((r.actual_qty / r.planned_qty) * 100).toFixed(1) : "0";
      rows.push([r.run_date, r.shift, r.tv_models?.name ?? "", String(r.planned_qty), String(r.actual_qty), String(r.defects_qty), String(r.rework_qty), eff, r.supervisor ?? ""]);
    }
    download(rows.map(r => r.join(",")).join("\n"), "production.csv", "text/csv");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Management"
        description="Track shift output, defects and rework. Stock auto-deducts via BOM."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            {canEdit && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New run</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log production run</DialogTitle></DialogHeader>
                  <form onSubmit={submit} className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.run_date} onChange={(e) => setForm({ ...form, run_date: e.target.value })} required /></div>
                    <div className="space-y-1.5"><Label>Shift</Label>
                      <Select value={form.shift} onValueChange={(v) => setForm({ ...form, shift: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Afternoon">Afternoon</SelectItem>
                          <SelectItem value="Night">Night</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1.5"><Label>Model</Label>
                      <Select value={form.model_id} onValueChange={(v) => setForm({ ...form, model_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                        <SelectContent>{models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Planned qty</Label><Input type="number" min={0} value={form.planned_qty} onChange={(e) => setForm({ ...form, planned_qty: +e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Actual qty</Label><Input type="number" min={0} value={form.actual_qty} onChange={(e) => setForm({ ...form, actual_qty: +e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Defects</Label><Input type="number" min={0} value={form.defects_qty} onChange={(e) => setForm({ ...form, defects_qty: +e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Rework</Label><Input type="number" min={0} value={form.rework_qty} onChange={(e) => setForm({ ...form, rework_qty: +e.target.value })} /></div>
                    <div className="col-span-2 space-y-1.5"><Label>Supervisor</Label><Input value={form.supervisor} onChange={(e) => setForm({ ...form, supervisor: e.target.value })} /></div>
                    <Button type="submit" className="col-span-2">Save run</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </>
        }
      />
      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Shift</TableHead><TableHead>Model</TableHead>
              <TableHead className="text-right">Planned</TableHead><TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Defects</TableHead><TableHead className="text-right">Rework</TableHead>
              <TableHead className="text-right">Eff %</TableHead><TableHead>Supervisor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((r) => {
              const eff = r.planned_qty ? (r.actual_qty / r.planned_qty) * 100 : 0;
              return (
                <TableRow key={r.id}>
                  <TableCell>{r.run_date}</TableCell>
                  <TableCell><Badge variant="secondary">{r.shift}</Badge></TableCell>
                  <TableCell>{r.tv_models?.name}</TableCell>
                  <TableCell className="text-right">{r.planned_qty}</TableCell>
                  <TableCell className="text-right font-medium">{r.actual_qty}</TableCell>
                  <TableCell className="text-right text-destructive">{r.defects_qty}</TableCell>
                  <TableCell className="text-right text-warning">{r.rework_qty}</TableCell>
                  <TableCell className="text-right">
                    <span className={eff >= 95 ? "text-success" : eff >= 80 ? "text-warning" : "text-destructive"}>
                      {eff.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell>{r.supervisor}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function download(content: string, name: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
