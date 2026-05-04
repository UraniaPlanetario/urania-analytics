import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** Vendedor mapeado pro user logado (texto exato do custom field
 *  "Vendedor/Consultor" no Kommo). NULL se admin não preencheu o campo
 *  `users.vendedor_consultor` no perfil. */
export function useMeuVendedor() {
  return useQuery<string | null>({
    queryKey: ['meu_vendedor_consultor'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('gold')
        .rpc('get_meu_vendedor_consultor');
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    staleTime: 60 * 60 * 1000,
  });
}

/** kommo_user_id do user logado — usado pra filtrar a Auditoria por
 *  responsible_user_id do lead. NULL se admin/sync não preencheu. */
export function useMeuKommoUserId() {
  return useQuery<number | null>({
    queryKey: ['meu_kommo_user_id'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('gold')
        .rpc('get_meu_kommo_user_id');
      if (error) throw error;
      return (data as number | null) ?? null;
    },
    staleTime: 60 * 60 * 1000,
  });
}
