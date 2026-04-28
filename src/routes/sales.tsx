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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

export const Route = createFileRoute("/sales")({ component: SalesPage });

type Sale = {
  id: string; sale_date: string; units_sold: number; unit_price: number; revenue: number;
  customer_name: string | null; region: string | null; tv_models?: { name: string } | null;
};

const REGIONS = ["Accra","Kumasi","Takoradi","Tamale","Cape Coast","Tema","Ho","Sunyani","Koforidua"];

function SalesPage() {
  const { hasAny } = useAuth();
  const canEdit = hasAny(["admin", "sales"]);
  const [list, setList] = useState<Sale[]>([]);
  const [models, setModels] = useState<{ id: string; name: string; default_price: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    sale_date: new Date().toISOString().slice(0,10),
    model_id: "", units_sold: 1, unit_price: 0, customer_name: "", region: "Accra",
  });

  useEffect(() => { load(); supabase.from("tv_models").select("id,name,default_price").then(({ data }) => setModels(data ?? [])); }, []);
  async function load() {
    const { data } = await supabase.from("sales").select("*, tv_models(name)").order("sale_date", { ascending: false }).limit(200);
    setList((data as Sale[]) ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.model_id) return toast.error("Select a model");
    const { error } = await supabase.from("sales").insert({
      sale_date: form.sale_date, model_id: form.model_id,
      units_sold: Number(form.units_sold), unit_price: Number(form.unit_price),
      customer_name: form.customer_name, region: form.region,
    });
    if (error) return toast.error(error.message);
    toast.success("Sale recorded"); setOpen(false); load();
  }

  // analytics
  const byDay = new Map<string, number>();
  const byModel = new Map<string, number>();
  for (const s of list) {
    byDay.set(s.sale_date, (byDay.get(s.sale_date) ?? 0) + Number(s.revenue));
    const n = s.tv_models?.name ?? "?";
    byModel.set(n, (byModel.get(n) ?? 0) + Number(s.units_sold));
  }
  const dayData = Array.from(byDay, ([d, r]) => ({ date: d.slice(5), revenue: r })).sort((a,b) => a.date.localeCompare(b.date));
  const modelData = Array.from(byModel, ([name, units]) => ({ name, units })).sort((a,b) => b.units - a.units);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Track sales by region, model, and customer."
        actions={canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New sale</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record sale</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Date</Label><Input type="date" required value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Region</Label>
                  <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5"><Label>Model</Label>
                  <Select value={form.model_id} onValueChange={(v) => {
                    const m = models.find(mm => mm.id === v);
                    setForm({ ...form, model_id: v, unit_price: m ? Number(m.default_price) : 0 });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Units</Label><Input type="number" min={1} required value={form.units_sold} onChange={(e) => setForm({ ...form, units_sold: +e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Unit price (₵)</Label><Input type="number" step="0.01" required value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: +e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Customer</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
                <Button type="submit" className="col-span-2">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Revenue trend (₵)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.02 250)" />
              <XAxis dataKey="date" stroke="oklch(0.7 0.02 250)" fontSize={11} />
              <YAxis stroke="oklch(0.7 0.02 250)" fontSize={11} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.32 0.02 250)", borderRadius: 6 }} />
              <Line type="monotone" dataKey="revenue" stroke="oklch(0.78 0.18 75)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Best-selling models (units)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.02 250)" />
              <XAxis dataKey="name" stroke="oklch(0.7 0.02 250)" fontSize={10} />
              <YAxis stroke="oklch(0.7 0.02 250)" fontSize={11} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.025 250)", border: "1px solid oklch(0.32 0.02 250)", borderRadius: 6 }} />
              <Bar dataKey="units" fill="oklch(0.72 0.16 220)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Model</TableHead><TableHead>Customer</TableHead>
              <TableHead>Region</TableHead><TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Revenue (₵)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.sale_date}</TableCell>
                <TableCell>{s.tv_models?.name}</TableCell>
                <TableCell>{s.customer_name}</TableCell>
                <TableCell>{s.region}</TableCell>
                <TableCell className="text-right">{s.units_sold}</TableCell>
                <TableCell className="text-right">{Number(s.unit_price).toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold text-success">{Number(s.revenue).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
