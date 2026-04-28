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

export const Route = createFileRoute("/faults")({ component: FaultsPage });

type Fault = {
  id: string; serial_number: string; fault_type: string; diagnosis: string | null;
  repair_action: string | null; technician: string | null; status: string;
  tv_models?: { name: string } | null;
};

const STATUSES = ["pending","in_repair","fixed","scrapped","retested"] as const;
const TYPES = ["display","power","sound","firmware","cosmetic","other"] as const;

function FaultsPage() {
  const { hasAny } = useAuth();
  const canEdit = hasAny(["admin", "qc"]);
  const [list, setList] = useState<Fault[]>([]);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    serial_number: "", model_id: "", fault_type: "display", diagnosis: "",
    repair_action: "", technician: "", status: "pending",
  });

  useEffect(() => { load(); supabase.from("tv_models").select("id,name").then(({ data }) => setModels(data ?? [])); }, []);
  async function load() {
    const { data } = await supabase.from("fault_records").select("*, tv_models(name)").order("created_at", { ascending: false }).limit(200);
    setList((data as Fault[]) ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("fault_records").insert({
      ...form,
      model_id: form.model_id || null,
      fault_type: form.fault_type as typeof TYPES[number],
      status: form.status as typeof STATUSES[number],
    });
    if (error) return toast.error(error.message);
    toast.success("Fault logged"); setOpen(false); load();
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("fault_records").update({ status: status as typeof STATUSES[number], updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faults & Rework"
        description="Track defective TV units, diagnosis, technicians and repair status."
        actions={canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New fault</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log fault</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Serial number</Label><Input required value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Model</Label>
                  <Select value={form.model_id} onValueChange={(v) => setForm({ ...form, model_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Fault type</Label>
                  <Select value={form.fault_type} onValueChange={(v) => setForm({ ...form, fault_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5"><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Repair action</Label><Input value={form.repair_action} onChange={(e) => setForm({ ...form, repair_action: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Technician</Label><Input value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} /></div>
                <Button type="submit" className="col-span-2">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial</TableHead><TableHead>Model</TableHead><TableHead>Type</TableHead>
              <TableHead>Diagnosis</TableHead><TableHead>Action</TableHead><TableHead>Tech</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">{f.serial_number}</TableCell>
                <TableCell>{f.tv_models?.name}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{f.fault_type}</Badge></TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground" title={f.diagnosis ?? ""}>{f.diagnosis}</TableCell>
                <TableCell className="max-w-[220px] truncate text-muted-foreground" title={f.repair_action ?? ""}>{f.repair_action}</TableCell>
                <TableCell>{f.technician}</TableCell>
                <TableCell>
                  {canEdit ? (
                    <Select value={f.status} onValueChange={(v) => updateStatus(f.id, v)}>
                      <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : <Badge variant="outline" className="capitalize">{f.status.replace("_"," ")}</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
