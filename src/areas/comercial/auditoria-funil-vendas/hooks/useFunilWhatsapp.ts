import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PIPELINE_VENDAS_WHATS_NAME } from '../types';

/** Lista de responsible_user_name distintos dos leads no Vendas WhatsApp.
 *  Usado pra popular o filtro de responsáveis. */
export function useResponsaveisFunil() {
  return useQuery<string[]>({
    queryKey: ['auditoria_funil_responsaveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('bronze')
        .from('kommo_leads_raw')
        .select('responsible_user_name')
        .eq('pipeline_name', PIPELINE_VENDAS_WHATS_NAME)
        .not('responsible_user_name', 'is', null)
        .not('is_deleted', 'is', true);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of data ?? []) if (row.responsible_user_name) set.add(row.responsible_user_name);
      return Array.from(set).sort();
    },
    staleTime: 60 * 60 * 1000, // 1h — lista de pessoas muda raramente
  });
}

/** Última atualização da bronze (synced_at mais recente). Usado no aviso
 *  "última atualização" do dashboard pra deixar claro que o "Hoje" é, na
 *  prática, o snapshot do último sync. */
export function useUltimoSync() {
  return useQuery<string | null>({
    queryKey: ['auditoria_funil_ultimo_sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('bronze')
        .from('kommo_leads_raw')
        .select('synced_at')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.synced_at ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
