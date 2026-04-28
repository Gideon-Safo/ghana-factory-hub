import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/qc")({ component: QCPage });

type Insp = {
  id: string; serial_number: string; final_result: "PASS" | "FAIL";
  display_test: string; audio_test: string; ports_test: string; remote_test: string;
  notes: string | null; created_at: string;
  tv_models?: { name: string } | null;
};

const TESTS = ["PASS", "FAIL", "NA"] as const;

function QCPage() {
  const { hasAny } = useAuth();
  const canEdit = hasAny(["admin", "qc"]);
  const [list, setList] = useState<Insp[]>([]);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    serial_number: "", model_id: "",
    display_test: "PASS", audio_test: "PASS", ports_test: "PASS", remote_test: "PASS",
    notes: "",
  });

  useEffect(() => { load(); supabase.from("tv_models").select("id,name").then(({ data }) => setModels(data ?? [])); }, []);
  async function load() {
    const { data } = await supabase.from("qc_inspections").select("*, tv_models(name)").order("created_at", { ascending: false }).limit(200);
    setList((data as Insp[]) ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const allTests = [form.display_test, form.audio_test, form.ports_test, form.remote_test];
    const final_result: "PASS" | "FAIL" = allTests.includes("FAIL") ? "FAIL" : "PASS";
    const { error } = await supabase.from("qc_inspections").insert({
      serial_number: form.serial_number,
      model_id: form.model_id || null,
      display_test: form.display_test as "PASS"|"FAIL"|"NA",
      audio_test: form.audio_test as "PASS"|"FAIL"|"NA",
      ports_test: form.ports_test as "PASS"|"FAIL"|"NA",
      remote_test: form.remote_test as "PASS"|"FAIL"|"NA",
      final_result, notes: form.notes,
    });
    if (error) return toast.error(error.message);
    toast.success(`Inspection logged: ${final_result}`); setOpen(false); load();
  }

  // failure analytics
  const fails = list.filter(l => l.final_result === "FAIL");
  const failBy: Record<string, number> = {};
  for (const f of fails) {
    if (f.display_test === "FAIL") failBy.Display = (failBy.Display ?? 0) + 1;
    if (f.audio_test === "FAIL") failBy.Audio = (failBy.Audio ?? 0) + 1;
    if (f.ports_test === "FAIL") failBy.Ports = (failBy.Ports ?? 0) + 1;
    if (f.remote_test === "FAIL") failBy.Remote = (failBy.Remote ?? 0) + 1;
  }
  const failData = Object.entries(failBy).map(([k, v]) => ({ category: k, count: v }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Control"
        description="Per-unit serial inspections and failure analytics."
        actions={canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New inspection</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>QC inspection</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Serial number</Label><Input required value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Model</Label>
                  <Select value={form.model_id} onValueChange={(v) => setForm({ ...form, model_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {(["display_test","audio_test","ports_test","remote_test"] as const).map(k => (
                  <div key={k} className="space-y-1.5">
                    <Label className="capitalize">{k.replace("_test","")} test</Label>
                    <Select value={form[k]} onValueChange={(v) => setForm({ ...form, [k]: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TESTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
                <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button type="submit" className="col-span-2">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      {failData.length > 0 && (
        <Card className="border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">QC failures by test</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={failData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.02 250)" />
              <XAxis dataKey="category" stroke="oklch(0.7 0.02 250)" fontSize={11} />
              <YAxis stroke="oklch(0.7 0.02 250)" fontSize={11} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.32 0.02 250)", borderRadius: 6 }} />
              <Bar dataKey="count" fill="oklch(0.65 0.22 25)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial</TableHead><TableHead>Model</TableHead>
              <TableHead>Display</TableHead><TableHead>Audio</TableHead>
              <TableHead>Ports</TableHead><TableHead>Remote</TableHead>
              <TableHead>Result</TableHead><TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.serial_number}</TableCell>
                <TableCell>{l.tv_models?.name}</TableCell>
                <TableCell><TestBadge v={l.display_test} /></TableCell>
                <TableCell><TestBadge v={l.audio_test} /></TableCell>
                <TableCell><TestBadge v={l.ports_test} /></TableCell>
                <TableCell><TestBadge v={l.remote_test} /></TableCell>
                <TableCell>
                  <Badge variant={l.final_result === "PASS" ? "default" : "destructive"}>{l.final_result}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{l.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function TestBadge({ v }: { v: string }) {
  if (v === "PASS") return <span className="text-success">✓</span>;
  if (v === "FAIL") return <span className="text-destructive">✗</span>;
  return <span className="text-muted-foreground">—</span>;
}
