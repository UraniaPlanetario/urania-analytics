import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BI_PLATFORM_ID, BI_ROLE_LABELS, type BIRole } from '@/lib/roles';
import { Loader2, Search, Save, X, Shield, ShieldCheck, UserCheck, UserX, RefreshCw, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_global_admin: boolean;
  auth_user_id: string | null;
  synced_from_hub_at: string | null;
  kommo_user_id: number | null;
  departments: { id: number; name: string; color: string; role: string }[];
  bi_role: BIRole | null;
}

interface KommoSyncResult {
  success: boolean;
  summary: {
    kommo_total: number;
    bi_total: number;
    mapped: number;
    overwritten: number;
    unchanged: number;
    not_found_in_bi: number;
    not_found_in_kommo: number;
  };
  mapped: { biEmail: string; biName: string | null; kommoId: number }[];
  overwritten: { biEmail: string; biName: string | null; kommoId: number; previousKommoId: number }[];
  notFoundInBI: { kommoId: number; name: string; email: string }[];
  notFoundInKommo: { biName: string | null; email: string }[];
}

const ROLE_OPTIONS: { value: BIRole | '__none__'; label: string }[] = [
  { value: '__none__', label: '— sem acesso' },
  { value: 'viewer', label: BI_ROLE_LABELS.viewer },
  { value: 'user', label: BI_ROLE_LABELS.user },
  { value: 'manager', label: BI_ROLE_LABELS.manager },
  { value: 'admin', label: BI_ROLE_LABELS.admin },
];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AdminUser>>({});
  const [syncResult, setSyncResult] = useState<KommoSyncResult | null>(null);

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const [usersRes, deptsRes, accessRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, email, full_name, is_active, is_global_admin, auth_user_id, synced_from_hub_at, kommo_user_id')
          .order('email'),
        supabase
          .from('user_departments')
          .select('user_id, role, departments!inner(id, name, color)'),
        supabase
          .from('user_platform_access')
          .select('user_id, role')
          .eq('platform_id', BI_PLATFORM_ID),
      ]);

      if (usersRes.error) throw usersRes.error;

      const deptByUser = new Map<string, AdminUser['departments']>();
      for (const row of (deptsRes.data ?? []) as any[]) {
        const list = deptByUser.get(row.user_id) ?? [];
        list.push({
          id: row.departments.id,
          name: row.departments.name,
          color: row.departments.color,
          role: row.role,
        });
        deptByUser.set(row.user_id, list);
      }

      const roleByUser = new Map<string, BIRole>();
      for (const row of accessRes.data ?? []) {
        roleByUser.set(row.user_id, row.role as BIRole);
      }

      return (usersRes.data ?? []).map((u) => ({
        ...u,
        departments: deptByUser.get(u.id) ?? [],
        bi_role: roleByUser.get(u.id) ?? null,
      }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      is_active: boolean;
      is_global_admin: boolean;
      bi_role: BIRole | null;
    }) => {
      const { error: updErr } = await supabase
        .from('users')
        .update({
          is_active: input.is_active,
          is_global_admin: input.is_global_admin,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);
      if (updErr) throw updErr;

      if (input.bi_role === null) {
        const { error } = await supabase
          .from('user_platform_access')
          .delete()
          .eq('user_id', input.id)
          .eq('platform_id', BI_PLATFORM_ID);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_platform_access')
          .upsert(
            {
              user_id: input.id,
              platform_id: BI_PLATFORM_ID,
              role: input.bi_role,
            },
            { onConflict: 'user_id,platform_id' },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['bi-role'] });
      qc.invalidateQueries({ queryKey: ['route-access-user-profile'] });
      toast.success('Usuário atualizado');
      setEditingId(null);
      setDraft({});
    },
    onError: (err: any) => toast.error(`Erro: ${err.message ?? err}`),
  });

  const inviteMutation = useMutation({
    mutationFn: async (args: { email: string; hasAuth: boolean }) => {
      if (args.hasAuth) {
        // User já tem conta: envia email de redefinição via API nativa (dispara email de verdade)
        const redirectTo = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(args.email, { redirectTo });
        if (error) throw error;
        return { mode: 'recovery' as const, email: args.email };
      } else {
        // Shadow user: edge function que usa admin.inviteUserByEmail (cria conta + envia email)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão expirada');
        const { data, error } = await supabase.functions.invoke('admin-invite-user', {
          body: { email: args.email, mode: 'invite' },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error) throw error;
        if (!(data as any)?.success) throw new Error((data as any)?.error ?? 'Falha no envio');
        return data as { mode: 'invite' | 'recovery'; email: string };
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(
        data.mode === 'invite'
          ? `Convite enviado para ${data.email}`
          : `Link de redefinição enviado para ${data.email}`,
      );
    },
    onError: (err: any) => toast.error(`Erro: ${err.message ?? err}`),
  });

  const syncKommoMutation = useMutation({
    mutationFn: async (): Promise<KommoSyncResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const { data, error } = await supabase.functions.invoke<KommoSyncResult>('admin-sync-kommo', {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.success) throw new Error((data as any)?.error ?? 'Falha na sincronização');
      return data;
    },
    onSuccess: (data) => {
      setSyncResult(data);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(
        `Kommo sync: ${data.summary.mapped} mapeados, ${data.summary.overwritten} atualizados, ${data.summary.unchanged} sem mudança`,
      );
    },
    onError: (err: any) => toast.error(`Erro: ${err.message ?? err}`),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) || (u.full_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

  const startEdit = (u: AdminUser) => {
    setEditingId(u.id);
    setDraft({
      is_active: u.is_active,
      is_global_admin: u.is_global_admin,
      bi_role: u.bi_role,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const save = (u: AdminUser) => {
    saveMutation.mutate({
      id: u.id,
      is_active: draft.is_active ?? u.is_active,
      is_global_admin: draft.is_global_admin ?? u.is_global_admin,
      bi_role: draft.bi_role ?? u.bi_role,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} usuários sincronizados. Nome, email e departamentos vêm do Hub (read-only).
          </p>
        </div>
        <button
          onClick={() => syncKommoMutation.mutate()}
          disabled={syncKommoMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/70 text-sm text-foreground disabled:opacity-50"
          title="Buscar usuários do Kommo e atualizar kommo_user_id por email"
        >
          {syncKommoMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Sincronizar Kommo
        </button>
      </div>

      {syncResult && (
        <div className="card-glass p-3 rounded-xl mb-4 border border-primary/30 bg-primary/5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 text-xs text-foreground">
              <p className="font-medium text-sm text-primary mb-1">Sincronização Kommo concluída</p>
              <p className="text-muted-foreground">
                Kommo: {syncResult.summary.kommo_total} · BI: {syncResult.summary.bi_total} · Mapeados:{' '}
                <strong>{syncResult.summary.mapped}</strong> · Atualizados:{' '}
                <strong>{syncResult.summary.overwritten}</strong> · Sem mudança:{' '}
                {syncResult.summary.unchanged} · Não achados no BI:{' '}
                {syncResult.summary.not_found_in_bi} · Não achados no Kommo:{' '}
                {syncResult.summary.not_found_in_kommo}
              </p>
              {syncResult.notFoundInBI.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-muted-foreground">
                    {syncResult.notFoundInBI.length} usuários Kommo sem match no BI
                  </summary>
                  <ul className="mt-1 ml-4 text-[11px] text-muted-foreground list-disc">
                    {syncResult.notFoundInBI.map((r) => (
                      <li key={r.kommoId}>
                        {r.name} — {r.email}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
            <button
              onClick={() => setSyncResult(null)}
              className="p-1 rounded hover:bg-muted/30 text-muted-foreground"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="card-glass p-3 rounded-xl mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar email ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1 text-xs">
          {(['active', 'inactive', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === f
                  ? 'bg-primary/20 text-primary border-primary/30'
                  : 'bg-secondary/30 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {f === 'active' ? 'Ativos' : f === 'inactive' ? 'Inativos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      <div className="card-glass rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left py-3 px-3 font-medium">Usuário</th>
              <th className="text-left py-3 px-3 font-medium">Departamentos</th>
              <th className="text-left py-3 px-3 font-medium">Login</th>
              <th className="text-left py-3 px-3 font-medium">Ativo</th>
              <th className="text-left py-3 px-3 font-medium">Global Admin</th>
              <th className="text-left py-3 px-3 font-medium">Role BI</th>
              <th className="text-right py-3 px-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isEditing = editingId === u.id;
              const isActive = isEditing ? (draft.is_active ?? u.is_active) : u.is_active;
              const isGlobalAdmin = isEditing ? (draft.is_global_admin ?? u.is_global_admin) : u.is_global_admin;
              const biRole = isEditing ? (draft.bi_role ?? u.bi_role) : u.bi_role;

              return (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="py-3 px-3">
                    <div className="font-medium text-foreground">{u.full_name || '—'}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span>{u.email}</span>
                      {u.kommo_user_id && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono"
                          title={`Kommo user ID ${u.kommo_user_id}`}
                        >
                          K:{u.kommo_user_id}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {u.departments.length === 0 ? (
                        <span className="text-[11px] italic text-muted-foreground">—</span>
                      ) : (
                        u.departments.map((d) => (
                          <span
                            key={d.id}
                            className="text-[10px] px-2 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: `${d.color}33`,
                              color: d.color,
                              borderColor: `${d.color}66`,
                            }}
                            title={d.role === 'leader' ? 'Líder' : 'Membro'}
                          >
                            {d.name}
                            {d.role === 'leader' && ' ★'}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {u.auth_user_id ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">
                        ativo
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground italic">
                        shadow
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <button
                        onClick={() => setDraft({ ...draft, is_active: !isActive })}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-green-500/20 text-green-500' : 'bg-muted/30 text-muted-foreground'
                        }`}
                      >
                        {isActive ? <UserCheck size={12} className="inline" /> : <UserX size={12} className="inline" />}
                      </button>
                    ) : isActive ? (
                      <UserCheck size={14} className="text-green-500" />
                    ) : (
                      <UserX size={14} className="text-muted-foreground" />
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <button
                        onClick={() => setDraft({ ...draft, is_global_admin: !isGlobalAdmin })}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isGlobalAdmin ? 'bg-amber-500/20 text-amber-500' : 'bg-muted/30 text-muted-foreground'
                        }`}
                      >
                        {isGlobalAdmin ? <ShieldCheck size={12} className="inline" /> : <Shield size={12} className="inline opacity-50" />}
                      </button>
                    ) : isGlobalAdmin ? (
                      <ShieldCheck size={14} className="text-amber-500" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <select
                        value={biRole ?? '__none__'}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            bi_role: e.target.value === '__none__' ? null : (e.target.value as BIRole),
                          })
                        }
                        className="text-xs px-2 py-1 rounded bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : biRole ? (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {BI_ROLE_LABELS[biRole]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">sem acesso</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => save(u)}
                          disabled={saveMutation.isPending}
                          className="p-1.5 rounded hover:bg-green-500/20 text-green-500 disabled:opacity-50"
                          title="Salvar"
                        >
                          {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded hover:bg-destructive/20 text-destructive"
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end items-center">
                        <button
                          onClick={() => {
                            const label = u.auth_user_id ? 'redefinição de senha' : 'convite';
                            if (confirm(`Enviar ${label} para ${u.email}?`)) {
                              inviteMutation.mutate({ email: u.email, hasAuth: !!u.auth_user_id });
                            }
                          }}
                          disabled={inviteMutation.isPending}
                          className="p-1.5 rounded hover:bg-primary/20 text-primary disabled:opacity-50"
                          title={u.auth_user_id ? 'Enviar link de redefinição de senha' : 'Enviar convite para criar senha'}
                        >
                          {inviteMutation.isPending && inviteMutation.variables?.email === u.email ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Mail size={14} />
                          )}
                        </button>
                        <button onClick={() => startEdit(u)} className="text-xs text-primary hover:underline">
                          Editar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
      )}
    </div>
  );
}
