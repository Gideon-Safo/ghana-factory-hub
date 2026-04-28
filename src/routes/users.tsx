import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/lib/auth-context";

export const Route = createFileRoute("/users")({ component: UsersPage });

type Profile = { id: string; full_name: string | null; email: string | null };
type RoleRow = { user_id: string; role: AppRole };

const ROLES: AppRole[] = ["admin","production","qc","inventory","sales"];

function UsersPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);

  useEffect(() => { load(); }, []);
  async function load() {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email").order("created_at"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    setProfiles((p as Profile[]) ?? []);
    setRoles((r as RoleRow[]) ?? []);
  }

  function rolesFor(uid: string) {
    return roles.filter(r => r.user_id === uid).map(r => r.role);
  }

  async function setUserRole(uid: string, role: AppRole) {
    // wipe and re-set: single primary role per user (simple model)
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", uid);
    if (delErr) return toast.error(delErr.message);
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error(error.message);
    toast.success("Role updated"); load();
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users & Roles" />
        <Card className="border-border bg-card p-8 text-center text-muted-foreground">
          Admin access required.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Roles" description="Assign access levels: admin, production, QC, inventory, sales." />
      <Card className="border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Email</TableHead>
              <TableHead>Current roles</TableHead><TableHead>Set role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => {
              const ur = rolesFor(p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.full_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell className="space-x-1">
                    {ur.length === 0 ? <span className="text-xs text-muted-foreground">none</span>
                      : ur.map(r => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
                  </TableCell>
                  <TableCell>
                    <Select value={ur[0] ?? ""} onValueChange={(v) => setUserRole(p.id, v as AppRole)}>
                      <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="Choose..." /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
