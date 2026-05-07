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
import { Plus, Download, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/production")({ component: ProductionPage });

type Run = {
  id: string; run_date: string; shift: string;
  model_id: string; planned_qty: number; actual_qty: number;
  defects_qty: number; rework_qty: number; supervisor: string | null;
  tv_models?: { name: string } | null;
};

type ModelRow = { model_id: string; planned_qty: number; actual_qty: number; defects_qty: number; rework_qty: number };

const emptyRow = (): ModelRow => ({ model_id: "", planned_qty: 100, actual_qty: 0, defects_qty: 0, rework_qty: 0 });

function ProductionPage() {
  const { hasAny } = useAuth();
  const canEdit = hasAny(["admin", "production"]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState({
    run_date: new Date().toISOString().slice(0, 10),
    shift: "Morning",
    supervisor: "",
  });
  const [rows, setRows] = useState<ModelRow[]>([emptyRow()]);

  useEffect(() => { load(); supabase.from("tv_models").select("id,name").order("name").then(({ data }) => setModels(data ?? [])); }, []);

  async function load() {
    const { data } = await supabase.from("production_runs")
      .select("*, tv_models(name)").order("run_date", { ascending: false }).order("created_at", { ascending: false }).limit(100);
    setRuns((data as Run[]) ?? []);
  }

  function updateRow(i: number, patch: Partial<ModelRow>) {
    setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const valid = rows.filter(r => r.model_id);
    if (!valid.length) return toast.error("Select at least one model");
    const ids = valid.map(r => r.model_id);
    if (new Set(ids).size !== ids.length) return toast.error("Duplicate models selected");

    const payload = valid.map(r => ({
      run_date: meta.run_date,
      shift: meta.shift as "Morning" | "Afternoon" | "Night",
      supervisor: meta.supervisor,
      model_id: r.model_id,
      planned_qty: Number(r.planned_qty),
      actual_qty: Number(r.actual_qty),
      defects_qty: Number(r.defects_qty),
      rework_qty: Number(r.rework_qty),
    }));
    const { error } = await supabase.from("production_runs").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(`${payload.length} production run(s) added — stock auto-deducted`);
    setOpen(false);
    setRows([emptyRow()]);
    load();
  }

  function exportCsv() {
    const out = [["Date","Shift","Model","Planned","Actual","Defects","Rework","Eff%","Supervisor"]];
    for (const r of runs) {
      const eff = r.planned_qty ? ((r.actual_qty / r.planned_qty) * 100).toFixed(1) : "0";
      out.push([r.run_date, r.shift, r.tv_models?.name ?? "", String(r.planned_qty), String(r.actual_qty), String(r.defects_qty), String(r.rework_qty), eff, r.supervisor ?? ""]);
    }
    download(out.map(r => r.join(",")).join("\n"), "production.csv", "text/csv");
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
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Log production run</DialogTitle></DialogHeader>
                  <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={meta.run_date} onChange={(e) => setMeta({ ...meta, run_date: e.target.value })} required /></div>
                      <div className="space-y-1.5"><Label>Shift</Label>
                        <Select value={meta.shift} onValueChange={(v) => setMeta({ ...meta, shift: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Morning">Morning</SelectItem>
                            <SelectItem value="Afternoon">Afternoon</SelectItem>
                            <SelectItem value="Night">Night</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label>Supervisor</Label><Input value={meta.supervisor} onChange={(e) => setMeta({ ...meta, supervisor: e.target.value })} /></div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Models</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, emptyRow()])}>
                          <Plus className="mr-1 h-3 w-3" />Add model
                        </Button>
                      </div>
                      {rows.map((row, i) => {
                        const used = new Set(rows.filter((_, idx) => idx !== i).map(r => r.model_id));
                        return (
                          <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-md border border-border p-2">
                            <div className="col-span-12 sm:col-span-4 space-y-1">
                              <Label className="text-xs">Model</Label>
                              <Select value={row.model_id} onValueChange={(v) => updateRow(i, { model_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                                <SelectContent>
                                  {models.filter(m => !used.has(m.id)).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-3 sm:col-span-2 space-y-1"><Label className="text-xs">Planned</Label><Input type="number" min={0} value={row.planned_qty} onChange={(e) => updateRow(i, { planned_qty: +e.target.value })} /></div>
                            <div className="col-span-3 sm:col-span-2 space-y-1"><Label className="text-xs">Actual</Label><Input type="number" min={0} value={row.actual_qty} onChange={(e) => updateRow(i, { actual_qty: +e.target.value })} /></div>
                            <div className="col-span-3 sm:col-span-1 space-y-1"><Label className="text-xs">Defects</Label><Input type="number" min={0} value={row.defects_qty} onChange={(e) => updateRow(i, { defects_qty: +e.target.value })} /></div>
                            <div className="col-span-3 sm:col-span-2 space-y-1"><Label className="text-xs">Rework</Label><Input type="number" min={0} value={row.rework_qty} onChange={(e) => updateRow(i, { rework_qty: +e.target.value })} /></div>
                            <div className="col-span-12 sm:col-span-1 flex justify-end">
                              <Button type="button" variant="ghost" size="icon" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button type="submit" className="w-full">Save run{rows.length > 1 ? "s" : ""}</Button>
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
