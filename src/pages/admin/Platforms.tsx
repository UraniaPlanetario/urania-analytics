import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, MonitorPlay, CheckCircle } from 'lucide-react';
import { BI_PLATFORM_ID } from '@/lib/roles';

interface PlatformRow {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  display_order: number;
  user_count: number;
}

export default function AdminPlatforms() {
  const { data: platforms = [], isLoading } = useQuery<PlatformRow[]>({
    queryKey: ['admin-platforms-full'],
    queryFn: async () => {
      const { data: pfs, error } = await supabase
        .from('platforms')
        .select('id, slug, name, description, color, is_active, display_order')
        .order('display_order');
      if (error) throw error;

      const { data: accesses } = await supabase.from('user_platform_access').select('platform_id');
      const counts = new Map<number, number>();
      for (const row of accesses ?? []) {
        counts.set(row.platform_id, (counts.get(row.platform_id) ?? 0) + 1);
      }

      return (pfs ?? []).map((p) => ({ ...p, user_count: counts.get(p.id) ?? 0 }));
    },
  });

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
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MonitorPlay size={22} className="text-primary" /> Plataformas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plataformas do ecossistema Urânia. <strong>BI</strong> é a única plataforma local; as demais são sincronizadas do Hub (read-only).
          Gerenciar acesso de usuários a plataformas é feito no Hub.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {platforms.map((p) => {
          const isBI = p.id === BI_PLATFORM_ID;
          return (
            <div
              key={p.id}
              className="card-glass p-4 rounded-xl border"
              style={{ borderColor: `${p.color}55` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                </div>
                {isBI && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    local
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mb-2">{p.slug}</p>
              {p.description && <p className="text-xs text-muted-foreground mb-3">{p.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {p.is_active ? (
                    <>
                      <CheckCircle size={12} className="text-green-500" /> ativa
                    </>
                  ) : (
                    'inativa'
                  )}
                </span>
                <span>·</span>
                <span>
                  <strong className="text-foreground">{p.user_count}</strong> usuário{p.user_count !== 1 && 's'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
