import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { QualidadeSDRRow } from '../types';

export function useQualidadeSDR() {
  return useQuery<QualidadeSDRRow[]>({
    queryKey: ['qualidade_sdr'],
    queryFn: async () => {
      const all: QualidadeSDRRow[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .schema('gold')
          .from('qualidade_sdr')
          .select('*')
          .order('data_fechamento_fmt', { ascending: false, nullsFirst: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as QualidadeSDRRow[]));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
  });
}
