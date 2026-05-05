import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/inventory")({ component: InventoryPage });

type Model = {
  id: string; name: string; item_code: string | null; supplier: string | null;
  warehouse_location: string | null; initial_stock: number; reorder_level: number; unit_cost: number;
};

type Row = Model & { assembled: number; sold: number; available: number };

function InventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: models }, { data: runs }, { data: sales }] = await Promise.all([
        supabase.from("tv_models").select("id,name,item_code,supplier,warehouse_location,initial_stock,reorder_level,unit_cost").order("size_inches"),
        supabase.from("production_runs").select("model_id,actual_qty"),
        supabase.from("sales").select("model_id,units_sold"),
      ]);
      const assembledMap = new Map<string, number>();
      for (const r of runs ?? []) assembledMap.set(r.model_id, (assembledMap.get(r.model_id) ?? 0) + (r.actual_qty ?? 0));
      const soldMap = new Map<string, number>();
      for (const s of sales ?? []) soldMap.set(s.model_id, (soldMap.get(s.model_id) ?? 0) + (s.units_sold ?? 0));
      setRows(((models as Model[]) ?? []).map((m) => {
        const assembled = assembledMap.get(m.id) ?? 0;
        const sold = soldMap.get(m.id) ?? 0;
        return { ...m, assembled, sold, available: (m.initial_stock ?? 0) + assembled - sold };
      }));
    })();
  }, []);

  const filtered = useMemo(
    () => rows.filter((i) => [i.item_code, i.name, i.supplier].join(" ").toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Management" description="Finished TV stock by model: assembled, sold, and available." />
      <div className="flex items-center gap-2">
        <Input placeholder="Search models..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      </div>
      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Initial stock</TableHead>
              <TableHead className="text-right">Qty assembled</TableHead>
              <TableHead className="text-right">Qty sold</TableHead>
              <TableHead className="text-right">Qty available</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Cost (₵)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => {
              const low = r.available <= r.reorder_level;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.item_code ?? "—"}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.supplier ?? "—"}</TableCell>
                  <TableCell>{r.warehouse_location ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.initial_stock}</TableCell>
                  <TableCell className="text-right">{r.assembled}</TableCell>
                  <TableCell className="text-right">{r.sold}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {r.available} {low && <Badge variant="destructive" className="ml-2">LOW</Badge>}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.reorder_level}</TableCell>
                  <TableCell className="text-right">{Number(r.unit_cost).toFixed(2)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
