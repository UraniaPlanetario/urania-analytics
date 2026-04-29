import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Agendamento } from '@/areas/onboarding/calendario-astronomos/types';

/** Retorna apenas os agendamentos do astrônomo logado. Filtragem feita no
 *  banco (RPC SECURITY DEFINER) — o cliente nunca recebe dados de outro
 *  astrônomo. */
export function useMeusAgendamentos() {
  return useQuery<Agendamento[]>({
    queryKey: ['meus_agendamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('gold')
        .rpc('get_meus_agendamentos');
      if (error) throw error;
      return (data ?? []) as Agendamento[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
