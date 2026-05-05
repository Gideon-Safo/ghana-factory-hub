import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Plus, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/inventory")({ component: InventoryPage });

type Comp = {
  id: string; item_code: string; name: string; supplier: string | null;
  current_stock: number; reorder_level: number; unit_cost: number; warehouse_location: string | null;
};
type ModelStock = { id: string; name: string; produced: number; sold: number; available: number };

function InventoryPage() {
  const { hasAny } = useAuth();
  const canEdit = hasAny(["admin", "inventory"]);
  const [items, setItems] = useState<Comp[]>([]);
  const [modelStock, setModelStock] = useState<ModelStock[]>([]);
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [openMove, setOpenMove] = useState(false);
  const [moveItem, setMoveItem] = useState<Comp | null>(null);

  const [form, setForm] = useState({ item_code: "", name: "", supplier: "", current_stock: 0, reorder_level: 0, unit_cost: 0, warehouse_location: "" });
  const [move, setMove] = useState({ movement_type: "IN", quantity: 0, reference: "", notes: "" });

  useEffect(() => { load(); }, []);
  async function load() {
    const [{ data }, { data: models }, { data: runs }, { data: sales }] = await Promise.all([
      supabase.from("components").select("*").order("name"),
      supabase.from("tv_models").select("id,name").order("name"),
      supabase.from("production_runs").select("model_id,actual_qty"),
      supabase.from("sales").select("model_id,units_sold"),
    ]);
    setItems((data as Comp[]) ?? []);
    const produced = new Map<string, number>();
    for (const r of runs ?? []) produced.set(r.model_id, (produced.get(r.model_id) ?? 0) + (r.actual_qty ?? 0));
    const sold = new Map<string, number>();
    for (const s of sales ?? []) sold.set(s.model_id, (sold.get(s.model_id) ?? 0) + (s.units_sold ?? 0));
    setModelStock((models ?? []).map((m) => {
      const p = produced.get(m.id) ?? 0; const so = sold.get(m.id) ?? 0;
      return { id: m.id, name: m.name, produced: p, sold: so, available: Math.max(0, p - so) };
    }));
  }

  const filtered = useMemo(
    () => items.filter((i) => [i.item_code, i.name, i.supplier].join(" ").toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("components").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Component added"); setOpenNew(false); load();
  }

  async function applyMove(e: React.FormEvent) {
    e.preventDefault();
    if (!moveItem) return;
    const { error } = await supabase.from("stock_movements").insert({
      component_id: moveItem.id,
      movement_type: move.movement_type as "IN" | "OUT" | "ADJUST",
      quantity: Number(move.quantity), reference: move.reference, notes: move.notes,
    });
    if (error) return toast.error(error.message);
    toast.success("Stock movement applied"); setOpenMove(false); load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Components, suppliers, stock movements. Auto-deducted by production runs."
        actions={canEdit && (
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New component</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add component</DialogTitle></DialogHeader>
              <form onSubmit={addItem} className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Item code</Label><Input required value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Supplier</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Location</Label><Input value={form.warehouse_location} onChange={(e) => setForm({ ...form, warehouse_location: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Initial stock</Label><Input type="number" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: +e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Reorder level</Label><Input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: +e.target.value })} /></div>
                <div className="space-y-1.5 col-span-2"><Label>Unit cost (₵)</Label><Input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: +e.target.value })} /></div>
                <Button type="submit" className="col-span-2">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card className="border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">TV stock by model</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead className="text-right">Produced</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelStock.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.name}</TableCell>
                <TableCell className="text-right text-muted-foreground">{m.produced}</TableCell>
                <TableCell className="text-right text-muted-foreground">{m.sold}</TableCell>
                <TableCell className="text-right font-semibold">{m.available}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center gap-2">
        <Input placeholder="Search components..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      </div>
      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Supplier</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Cost (₵)</TableHead>
              <TableHead className="text-right">Value (₵)</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const low = c.current_stock <= c.reorder_level;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.item_code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.supplier}</TableCell>
                  <TableCell>{c.warehouse_location}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {c.current_stock} {low && <Badge variant="destructive" className="ml-2">LOW</Badge>}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{c.reorder_level}</TableCell>
                  <TableCell className="text-right">{Number(c.unit_cost).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{(c.current_stock * Number(c.unit_cost)).toLocaleString()}</TableCell>
                  <TableCell>
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => { setMoveItem(c); setMove({ movement_type: "IN", quantity: 0, reference: "", notes: "" }); setOpenMove(true); }}>
                        <ArrowDownUp className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={openMove} onOpenChange={setOpenMove}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stock movement · {moveItem?.name}</DialogTitle></DialogHeader>
          <form onSubmit={applyMove} className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2"><Label>Type</Label>
              <Select value={move.movement_type} onValueChange={(v) => setMove({ ...move, movement_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Stock IN (receive)</SelectItem>
                  <SelectItem value="OUT">Stock OUT (issue)</SelectItem>
                  <SelectItem value="ADJUST">ADJUST (set absolute)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" required value={move.quantity} onChange={(e) => setMove({ ...move, quantity: +e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Reference</Label><Input value={move.reference} onChange={(e) => setMove({ ...move, reference: e.target.value })} /></div>
            <div className="space-y-1.5 col-span-2"><Label>Notes</Label><Input value={move.notes} onChange={(e) => setMove({ ...move, notes: e.target.value })} /></div>
            <Button type="submit" className="col-span-2">Apply</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
