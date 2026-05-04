import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { LeadAtual } from '@/areas/comercial/auditoria-funil-vendas/hooks/useFunilWhatsapp';

/** Vendedor mapeado pro user logado (texto exato do custom field
 *  "Vendedor/Consultor" no Kommo). NULL se admin não preencheu o campo
 *  `users.vendedor_consultor` no perfil.
 *  Override: admins podem passar p_override pra simular outro vendedor. */
export function useMeuVendedor(override?: string | null) {
  return useQuery<string | null>({
    queryKey: ['meu_vendedor_consultor', override ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('gold')
        .rpc('get_meu_vendedor_consultor', { p_override: override ?? null });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    staleTime: 60 * 60 * 1000,
  });
}

/** kommo_user_id do user logado — usado pra filtrar a Auditoria por
 *  responsible_user_id do lead. NULL se admin/sync não preencheu.
 *  Override admin: simula outro vendedor. */
export function useMeuKommoUserId(override?: number | null) {
  return useQuery<number | null>({
    queryKey: ['meu_kommo_user_id', override ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('gold')
        .rpc('get_meu_kommo_user_id', { p_override: override ?? null });
      if (error) throw error;
      return (data as number | null) ?? null;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export interface MeuLeadFechado {
  lead_id: number;
  lead_name: string | null;
  vendedor: string | null;
  data_fechamento_fmt: string | null;
  data_agendamento_fmt: string | null;
  data_cancelamento_fmt: string | null;
  cancelado: boolean;
  pipeline_onboarding: string | null;
  pipeline_atual: string | null;
  status_atual: string | null;
  lead_price: number | null;
  n_diarias: string | null;
  occurrence: number;
  lead_created_at: string | null;
}

/** Leads do vendedor logado em gold.funil_whats_leads_atual. Override admin. */
export function useMeusLeadsFunil(kommoUserIdOverride?: number | null) {
  return useQuery<LeadAtual[]>({
    queryKey: ['meus_leads_funil', kommoUserIdOverride ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('gold')
        .rpc('get_meus_leads_funil', { p_kommo_user_id_override: kommoUserIdOverride ?? null });
      if (error) throw error;
      return (data ?? []) as LeadAtual[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Leads fechados (gold.leads_closed) do vendedor logado, com pipeline/status
 *  atuais (do bronze). Override admin. */
export function useMeusLeadsFechados(vendedorOverride?: string | null) {
  return useQuery<MeuLeadFechado[]>({
    queryKey: ['meus_leads_fechados', vendedorOverride ?? null],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('gold')
        .rpc('get_meus_leads_fechados', { p_vendedor_override: vendedorOverride ?? null });
      if (error) throw error;
      return (data ?? []) as MeuLeadFechado[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface VendedorImpersonar {
  vendedor: string;
  kommo_user_id: number | null;
}

/** Lista de vendedores ativos pra admin escolher na "Visualizar como". */
export function useListaVendedoresImpersonar(enabled: boolean) {
  return useQuery<VendedorImpersonar[]>({
    queryKey: ['lista_vendedores_impersonar'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('gold')
        .rpc('lista_vendedores_pra_impersonar');
      if (error) throw error;
      return (data ?? []) as VendedorImpersonar[];
    },
    staleTime: 60 * 60 * 1000,
  });
}
