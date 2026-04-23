import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BI_PLATFORM_ID } from '@/lib/roles';
import { Loader2, Plus, Trash2, ShieldCheck, Crown, Building2, User, ChevronDown, ChevronRight, Globe, X } from 'lucide-react';
import { toast } from 'sonner';

type RuleType = 'global_admin' | 'platform_admin' | 'department_role' | 'specific_user';

interface Rule {
  id: number;
  policy_id: number;
  rule_type: RuleType;
  platform_id: number | null;
  department_id: number | null;
  min_role: string | null;
  user_id: string | null;
  is_system: boolean;
}

interface Policy {
  id: number;
  platform_id: number;
  route: string;
  label: string;
  managed_by: string;
  rules: Rule[];
}

interface Platform {
  id: number;
  slug: string;
  name: string;
}
interface Department {
  id: number;
  name: string;
  color: string;
}
interface UserLite {
  id: string;
  email: string;
  full_name: string | null;
}

const BI_ROUTES_DEFAULT = [
  { route: '/comercial/qualidade', label: 'Qualidade de Fechamento' },
  { route: '/comercial/monitoramento', label: 'Monitoramento' },
  { route: '/comercial/leads-fechados', label: 'Leads Fechados' },
  { route: '/comercial/campanhas', label: 'Campanhas' },
  { route: '/comercial/desempenho-vendedor', label: 'Desempenho Vendedor' },
  { route: '/comercial/desempenho-sdr', label: 'Desempenho SDR' },
  { route: '/financeiro', label: 'Financeiro' },
  { route: '/marketing', label: 'Marketing' },
  { route: '/onboarding', label: 'Onboarding' },
  { route: '/tecnologia', label: 'Tecnologia' },
  { route: '/admin/usuarios', label: 'Admin: Usuários' },
  { route: '/admin/departamentos', label: 'Admin: Departamentos' },
  { route: '/admin/acessos', label: 'Admin: Controle de Acesso' },
  { route: '/admin/plataformas', label: 'Admin: Plataformas' },
];

export default function AdminAccessControl() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newRoute, setNewRoute] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const { data: policies = [], isLoading } = useQuery<Policy[]>({
    queryKey: ['admin-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_access_policies')
        .select(`
          id, platform_id, route, label, managed_by,
          rules:route_access_rules (
            id, policy_id, rule_type, platform_id, department_id, min_role, user_id, is_system
          )
        `)
        .eq('platform_id', BI_PLATFORM_ID)
        .order('route');

      if (error) throw error;
      return (data ?? []) as Policy[];
    },
  });

  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ['admin-platforms-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platforms').select('id, slug, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['admin-departments-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: users = [] } = useQuery<UserLite[]>({
    queryKey: ['admin-users-lite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('is_active', true)
        .order('email');
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createPolicy = async () => {
    if (!newRoute.trim()) return toast.error('Rota é obrigatória');
    try {
      const { data, error } = await supabase
        .from('route_access_policies')
        .insert({
          platform_id: BI_PLATFORM_ID,
          route: newRoute.trim(),
          label: newLabel.trim() || newRoute.trim(),
          managed_by: 'admin',
        })
        .select()
        .single();
      if (error) throw error;

      // Regra default: global_admin sempre liberado
      await supabase.from('route_access_rules').insert({
        policy_id: data.id,
        rule_type: 'global_admin',
        is_system: true,
      });

      qc.invalidateQueries({ queryKey: ['admin-policies'] });
      qc.invalidateQueries({ queryKey: ['route-access-policies'] });
      toast.success('Policy criada');
      setCreating(false);
      setNewRoute('');
      setNewLabel('');
    } catch (err: any) {
      toast.error(`Erro: ${err.message ?? err}`);
    }
  };

  const deletePolicy = async (id: number) => {
    if (!confirm('Remover esta policy? Todos os usuários voltarão a ter acesso a esta rota.')) return;
    try {
      const { error } = await supabase.from('route_access_policies').delete().eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['admin-policies'] });
      qc.invalidateQueries({ queryKey: ['route-access-policies'] });
      toast.success('Policy removida');
    } catch (err: any) {
      toast.error(`Erro: ${err.message ?? err}`);
    }
  };

  const deleteRule = async (ruleId: number, isSystem: boolean) => {
    if (isSystem) {
      if (!confirm('Esta regra é do sistema (ex: admin global). Remover mesmo assim?')) return;
    }
    try {
      const { error } = await supabase.from('route_access_rules').delete().eq('id', ruleId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['admin-policies'] });
      qc.invalidateQueries({ queryKey: ['route-access-policies'] });
      toast.success('Regra removida');
    } catch (err: any) {
      toast.error(`Erro: ${err.message ?? err}`);
    }
  };

  const addRule = async (policyId: number, payload: Partial<Rule>) => {
    try {
      const { error } = await supabase.from('route_access_rules').insert({
        policy_id: policyId,
        rule_type: payload.rule_type!,
        platform_id: payload.platform_id ?? null,
        department_id: payload.department_id ?? null,
        min_role: payload.min_role ?? null,
        user_id: payload.user_id ?? null,
        is_system: false,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['admin-policies'] });
      qc.invalidateQueries({ queryKey: ['route-access-policies'] });
      toast.success('Regra adicionada');
    } catch (err: any) {
      toast.error(`Erro: ${err.message ?? err}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const policyByRoute = new Map(policies.map((p) => [p.route, p]));
  const availableRoutes = BI_ROUTES_DEFAULT.filter((r) => !policyByRoute.has(r.route));

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck size={22} className="text-primary" /> Controle de Acesso
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cada rota tem uma <strong>policy</strong> com uma ou mais <strong>regras</strong>. O usuário pode acessar a rota se <strong>qualquer</strong> regra passar (OR).
          Rotas sem policy ficam liberadas por padrão.
        </p>
      </div>

      <div className="card-glass p-4 rounded-xl mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-foreground">Criar nova policy</h2>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
            >
              <Plus size={12} /> Nova
            </button>
          )}
        </div>

        {creating && (
          <div className="flex flex-wrap gap-2 items-center mt-3">
            <select
              value={newRoute}
              onChange={(e) => {
                setNewRoute(e.target.value);
                const found = BI_ROUTES_DEFAULT.find((r) => r.route === e.target.value);
                if (found) setNewLabel(found.label);
              }}
              className="text-xs px-2 py-2 rounded bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">— escolher rota —</option>
              {availableRoutes.map((r) => (
                <option key={r.route} value={r.route}>
                  {r.route}
                </option>
              ))}
              <option value="__custom">Outra (digitar)</option>
            </select>
            {newRoute === '__custom' && (
              <input
                type="text"
                placeholder="/caminho/da/rota"
                value={newLabel === newRoute ? '' : newRoute}
                onChange={(e) => setNewRoute(e.target.value)}
                className="text-xs px-2 py-2 rounded bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
            <input
              type="text"
              placeholder="Label (ex: Financeiro)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 min-w-[200px] text-xs px-2 py-2 rounded bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={createPolicy}
              className="text-xs px-3 py-2 rounded-full bg-primary/20 text-primary border border-primary/30"
            >
              Criar
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewRoute('');
                setNewLabel('');
              }}
              className="text-xs px-3 py-2 rounded-full bg-destructive/20 text-destructive border border-destructive/30"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {policies.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma policy cadastrada. Crie uma acima para restringir uma rota.
          </p>
        )}
        {policies.map((p) => {
          const isExpanded = expanded.has(p.id);
          return (
            <div key={p.id} className="card-glass rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-3 hover:bg-muted/10">
                <button onClick={() => toggleExpand(p.id)} className="flex-1 flex items-center gap-2 text-left">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="font-mono text-xs text-primary">{p.route}</span>
                  <span className="text-sm text-foreground">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {p.rules.length} regra{p.rules.length !== 1 && 's'}
                  </span>
                </button>
                <button
                  onClick={() => deletePolicy(p.id)}
                  className="p-1.5 rounded hover:bg-destructive/20 text-destructive ml-2"
                  title="Remover policy"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-border p-3 space-y-3">
                  <div className="space-y-1.5">
                    {p.rules.map((rule) => (
                      <RuleRow
                        key={rule.id}
                        rule={rule}
                        platforms={platforms}
                        departments={departments}
                        users={users}
                        onDelete={() => deleteRule(rule.id, rule.is_system)}
                      />
                    ))}
                  </div>
                  <AddRuleForm
                    platforms={platforms}
                    departments={departments}
                    users={users}
                    onAdd={(payload) => addRule(p.id, payload)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  platforms,
  departments,
  users,
  onDelete,
}: {
  rule: Rule;
  platforms: Platform[];
  departments: Department[];
  users: UserLite[];
  onDelete: () => void;
}) {
  const pf = platforms.find((p) => p.id === rule.platform_id);
  const dept = departments.find((d) => d.id === rule.department_id);
  const u = users.find((x) => x.id === rule.user_id);

  let label = '';
  let Icon = Globe;

  switch (rule.rule_type) {
    case 'global_admin':
      label = 'Admin global';
      Icon = Crown;
      break;
    case 'platform_admin':
      label = `Admin/Manager da plataforma "${pf?.name ?? '???'}"`;
      Icon = ShieldCheck;
      break;
    case 'department_role':
      label = `${dept?.name ?? '???'} — ${rule.min_role === 'leader' ? 'Líder' : 'Membro+'}`;
      Icon = Building2;
      break;
    case 'specific_user':
      label = `Usuário: ${u?.full_name ?? u?.email ?? rule.user_id ?? '???'}`;
      Icon = User;
      break;
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded bg-secondary/40 border border-border/50">
      <Icon size={14} className="text-muted-foreground shrink-0" />
      <span className="text-xs text-foreground flex-1">{label}</span>
      {rule.is_system && (
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">sistema</span>
      )}
      <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/20 text-destructive">
        <X size={12} />
      </button>
    </div>
  );
}

function AddRuleForm({
  platforms,
  departments,
  users,
  onAdd,
}: {
  platforms: Platform[];
  departments: Department[];
  users: UserLite[];
  onAdd: (payload: Partial<Rule>) => void;
}) {
  const [type, setType] = useState<RuleType>('platform_admin');
  const [platformId, setPlatformId] = useState<number>(BI_PLATFORM_ID);
  const [deptId, setDeptId] = useState<number | null>(null);
  const [minRole, setMinRole] = useState<string>('member');
  const [userId, setUserId] = useState<string>('');

  const canSubmit = useMemo(() => {
    if (type === 'global_admin') return true;
    if (type === 'platform_admin') return !!platformId;
    if (type === 'department_role') return !!deptId && !!minRole;
    if (type === 'specific_user') return !!userId;
    return false;
  }, [type, platformId, deptId, minRole, userId]);

  const handleAdd = () => {
    const payload: Partial<Rule> = { rule_type: type };
    if (type === 'platform_admin') payload.platform_id = platformId;
    if (type === 'department_role') {
      payload.department_id = deptId!;
      payload.min_role = minRole;
    }
    if (type === 'specific_user') payload.user_id = userId;
    onAdd(payload);
    setDeptId(null);
    setUserId('');
  };

  return (
    <div className="flex flex-wrap gap-2 items-center p-2 rounded bg-muted/20 border border-dashed border-border">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as RuleType)}
        className="text-xs px-2 py-1.5 rounded bg-secondary border border-border"
      >
        <option value="global_admin">Admin global</option>
        <option value="platform_admin">Admin/Manager de plataforma</option>
        <option value="department_role">Membros de um departamento</option>
        <option value="specific_user">Usuário específico</option>
      </select>

      {type === 'platform_admin' && (
        <select
          value={platformId}
          onChange={(e) => setPlatformId(Number(e.target.value))}
          className="text-xs px-2 py-1.5 rounded bg-secondary border border-border"
        >
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {type === 'department_role' && (
        <>
          <select
            value={deptId ?? ''}
            onChange={(e) => setDeptId(e.target.value ? Number(e.target.value) : null)}
            className="text-xs px-2 py-1.5 rounded bg-secondary border border-border"
          >
            <option value="">— departamento —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={minRole}
            onChange={(e) => setMinRole(e.target.value)}
            className="text-xs px-2 py-1.5 rounded bg-secondary border border-border"
          >
            <option value="member">Qualquer membro</option>
            <option value="leader">Só líderes</option>
          </select>
        </>
      )}

      {type === 'specific_user' && (
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="text-xs px-2 py-1.5 rounded bg-secondary border border-border min-w-[200px]"
        >
          <option value="">— usuário —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name ?? u.email}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={handleAdd}
        disabled={!canSubmit}
        className="ml-auto flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 disabled:opacity-40"
      >
        <Plus size={12} /> Adicionar regra
      </button>
    </div>
  );
}
