import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/reorder")({ component: ReorderPage });

type Comp = {
  id: string; item_code: string; name: string; supplier: string | null;
  current_stock: number; reorder_level: number; unit_cost: number;
};

function ReorderPage() {
  const [items, setItems] = useState<Comp[]>([]);
  useEffect(() => {
    supabase.from("components").select("*").order("name").then(({ data }) => {
      setItems(((data as Comp[]) ?? []).filter((c) => c.current_stock <= c.reorder_level * 1.5));
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Reorder Alerts" description="Components at or near reorder threshold. Suggested order = 2× reorder level − current stock." />
      {items.length === 0 ? (
        <Card className="border-border bg-card p-8 text-center text-muted-foreground">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-success" /> All stock levels healthy.
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead><TableHead>Item</TableHead><TableHead>Supplier</TableHead>
                <TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Reorder at</TableHead>
                <TableHead className="text-right">Suggested qty</TableHead><TableHead className="text-right">Est. cost (₵)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => {
                const suggested = Math.max(0, c.reorder_level * 2 - c.current_stock);
                const cost = suggested * Number(c.unit_cost);
                const critical = c.current_stock <= c.reorder_level;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.item_code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.supplier}</TableCell>
                    <TableCell className="text-right">{c.current_stock}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{c.reorder_level}</TableCell>
                    <TableCell className="text-right font-semibold">{suggested}</TableCell>
                    <TableCell className="text-right">{cost.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={critical ? "destructive" : "secondary"}>
                        {critical ? "REORDER NOW" : "Approaching"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
