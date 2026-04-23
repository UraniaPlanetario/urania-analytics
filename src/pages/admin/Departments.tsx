import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeptRow {
  id: number;
  slug: string;
  name: string;
  color: string;
  is_active: boolean;
  parent_department_id: number | null;
  member_count: number;
  leader_count: number;
}

interface RouteAccessRow {
  department_id: number;
  route: string;
}

/** Rotas do BI configuráveis por departamento. */
const BI_ROUTES = [
  { route: '/comercial/qualidade', label: 'Qualidade de Fechamento' },
  { route: '/comercial/monitoramento', label: 'Monitoramento de Usuário' },
  { route: '/comercial/leads-fechados', label: 'Leads Fechados' },
  { route: '/comercial/campanhas', label: 'Campanhas Semanais' },
  { route: '/comercial/desempenho-vendedor', label: 'Desempenho Vendedor' },
  { route: '/comercial/desempenho-sdr', label: 'Desempenho SDR' },
  { route: '/financeiro', label: 'Financeiro' },
  { route: '/marketing', label: 'Marketing' },
  { route: '/onboarding', label: 'Onboarding' },
  { route: '/tecnologia', label: 'Tecnologia' },
];

export default function AdminDepartments() {
  const qc = useQueryClient();

  const { data: departments = [], isLoading } = useQuery<DeptRow[]>({
    queryKey: ['admin-departments'],
    queryFn: async () => {
      const { data: depts, error } = await supabase
        .from('departments')
        .select('id, slug, name, color, is_active, parent_department_id')
        .order('name');
      if (error) throw error;

      const { data: members } = await supabase
        .from('user_departments')
        .select('department_id, role');

      const counts = new Map<number, { m: number; l: number }>();
      for (const row of members ?? []) {
        const cur = counts.get(row.department_id) ?? { m: 0, l: 0 };
        if (row.role === 'leader') cur.l += 1;
        else cur.m += 1;
        counts.set(row.department_id, cur);
      }

      return (depts ?? []).map((d) => ({
        ...d,
        member_count: counts.get(d.id)?.m ?? 0,
        leader_count: counts.get(d.id)?.l ?? 0,
      }));
    },
  });

  const { data: currentAccess = [] } = useQuery<RouteAccessRow[]>({
    queryKey: ['admin-department-route-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_route_access')
        .select('department_id, route');
      if (error) throw error;
      return (data ?? []) as RouteAccessRow[];
    },
  });

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = new Set<string>();
    for (const r of currentAccess) s.add(`${r.department_id}:${r.route}`);
    setChecked(s);
  }, [currentAccess]);

  const toggle = (deptId: number, route: string) => {
    const key = `${deptId}:${route}`;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasChanges = (() => {
    const original = new Set(currentAccess.map((r) => `${r.department_id}:${r.route}`));
    if (original.size !== checked.size) return true;
    for (const k of checked) if (!original.has(k)) return true;
    return false;
  })();

  const save = async () => {
    setSaving(true);
    try {
      const { error: delErr } = await supabase.from('department_route_access').delete().neq('id', 0);
      if (delErr) throw delErr;

      const rows = Array.from(checked).map((key) => {
        const idx = key.indexOf(':');
        const deptId = Number(key.slice(0, idx));
        const route = key.slice(idx + 1);
        const label = BI_ROUTES.find((r) => r.route === route)?.label ?? route;
        return { department_id: deptId, route, label };
      });

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('department_route_access').insert(rows);
        if (insErr) throw insErr;
      }

      qc.invalidateQueries({ queryKey: ['admin-department-route-access'] });
      qc.invalidateQueries({ queryKey: ['department-route-access'] });
      toast.success('Permissões salvas');
    } catch (err: any) {
      toast.error(`Erro: ${err.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const activeDepts = departments.filter((d) => d.is_active);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 size={22} className="text-primary" /> Departamentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeDepts.length} departamentos sincronizados do Hub. Use a matriz abaixo para liberar rotas específicas a cada departamento —
          afeta apenas usuários com role <strong>Usuário</strong> ou <strong>Visualizador</strong>.
        </p>
      </div>

      <div className="card-glass rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-3 font-medium">Departamento</th>
              <th className="text-left py-3 px-3 font-medium">Slug</th>
              <th className="text-left py-3 px-3 font-medium">Membros</th>
              <th className="text-left py-3 px-3 font-medium">Líderes</th>
            </tr>
          </thead>
          <tbody>
            {activeDepts.map((d) => (
              <tr key={d.id} className="border-b border-border/50">
                <td className="py-3 px-3">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="font-medium">{d.name}</span>
                  </span>
                </td>
                <td className="py-3 px-3 text-xs font-mono text-muted-foreground">{d.slug}</td>
                <td className="py-3 px-3 text-foreground">{d.member_count}</td>
                <td className="py-3 px-3 text-foreground">{d.leader_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-glass rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Matriz de acesso: Departamento × Rota</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Marque as rotas que cada departamento pode acessar. Admins globais e usuários com role <em>Gestão</em>/<em>Admin</em> no BI ignoram esta matriz.
            </p>
          </div>
          {hasChanges && (
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-2 rounded-lg gradient-primary text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-3 font-medium sticky left-0 bg-card min-w-[180px]">
                  Departamento
                </th>
                {BI_ROUTES.map((r) => (
                  <th key={r.route} className="py-3 px-2 text-center font-medium min-w-[110px]">
                    <span className="text-[11px] leading-tight block">{r.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeDepts.map((d) => (
                <tr key={d.id} className="border-b border-border/30 hover:bg-muted/10">
                  <td className="py-2 px-3 sticky left-0 bg-card">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="font-medium">{d.name}</span>
                    </span>
                  </td>
                  {BI_ROUTES.map((r) => {
                    const key = `${d.id}:${r.route}`;
                    const on = checked.has(key);
                    return (
                      <td key={r.route} className="py-2 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(d.id, r.route)}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
