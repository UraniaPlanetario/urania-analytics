import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, X, Plus } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  nome: string | null;
  roles: string[];
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin (acesso total)' },
  { value: 'super_viewer', label: 'Super Viewer (todos os dashboards)' },
  { value: 'viewer_qualidade_comercial', label: 'Viewer Qualidade Comercial' },
  { value: 'gestor_onboarding', label: 'Gestor Onboarding' },
];

export default function AdminUsuarios() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Record<string, string[]>>({});

  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: ['all_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('email');
      if (error) throw error;
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, roles }: { id: string; roles: string[] }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ roles, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_profiles'] });
      queryClient.invalidateQueries({ queryKey: ['user_profile'] });
    },
  });

  const startEdit = (p: Profile) => setEditing({ ...editing, [p.id]: [...p.roles] });
  const cancelEdit = (id: string) => {
    const next = { ...editing };
    delete next[id];
    setEditing(next);
  };

  const toggleRole = (id: string, role: string) => {
    const current = editing[id] || [];
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    setEditing({ ...editing, [id]: next });
  };

  const save = async (id: string) => {
    await updateMutation.mutateAsync({ id, roles: editing[id] || [] });
    cancelEdit(id);
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
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
        <p className="text-sm text-muted-foreground mt-1">Defina os roles de acesso de cada usuário</p>
      </div>

      <div className="card-glass p-4 rounded-xl mb-4">
        <h3 className="text-sm font-medium text-foreground mb-2">Roles disponíveis:</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• <span className="text-primary font-medium">admin</span>: acesso total a tudo + gerencia usuários</li>
          <li>• <span className="text-primary font-medium">super_viewer</span>: vê todos os dashboards (gestão geral)</li>
          <li>• <span className="text-primary font-medium">viewer_qualidade_comercial</span>: vê apenas Qualidade + Monitoramento de Usuários</li>
          <li>• <span className="text-primary font-medium">gestor_onboarding</span>: vê área de Onboarding (futuro)</li>
        </ul>
      </div>

      <div className="card-glass p-4 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Email</th>
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Nome</th>
              <th className="text-left py-3 px-3 text-muted-foreground font-medium">Roles</th>
              <th className="text-right py-3 px-3 text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const isEditing = editing[p.id] !== undefined;
              const currentRoles = isEditing ? editing[p.id] : p.roles;
              return (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-3 px-3 text-foreground">{p.email}</td>
                  <td className="py-3 px-3 text-foreground">{p.nome || '—'}</td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-1">
                        {ROLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => toggleRole(p.id, opt.value)}
                            className={`text-[10px] px-2 py-1 rounded-full border ${
                              currentRoles.includes(opt.value)
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : 'bg-secondary/30 text-muted-foreground border-border'
                            }`}
                          >
                            {currentRoles.includes(opt.value) ? '✓ ' : '+ '}
                            {opt.value}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {p.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">Sem roles</span>
                        ) : (
                          p.roles.map((r) => (
                            <span key={r} className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => save(p.id)}
                          className="p-1.5 rounded hover:bg-green-500/20 text-green-500"
                          title="Salvar"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => cancelEdit(p.id)}
                          className="p-1.5 rounded hover:bg-destructive/20 text-destructive"
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(p)}
                        className="text-xs text-primary hover:underline"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
