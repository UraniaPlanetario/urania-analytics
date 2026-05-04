import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LeadClosed, LeadClosedOrigem, ClosedFilters } from '../types';
import { useMemo } from 'react';

export function useClosedLeads() {
  return useQuery<LeadClosed[]>({
    queryKey: ['leads_closed'],
    queryFn: async () => {
      const allData: LeadClosed[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .schema('gold')
          .from('leads_closed')
          .select('*')
          .order('entrada_onboarding_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/** Leads fechados enriquecidos com classificação de caminho no CRM (gold.leads_closed_origem). */
export function useLeadsOrigem() {
  return useQuery<LeadClosedOrigem[]>({
    queryKey: ['leads_closed_origem'],
    queryFn: async () => {
      const all: LeadClosedOrigem[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .schema('gold')
          .from('leads_closed_origem')
          .select('*')
          .order('data_fechamento_fmt', { ascending: false, nullsFirst: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as LeadClosedOrigem[]));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateInRange(ref: string, range: { from: Date | null; to: Date | null }): boolean {
  if (range.from && ref < ymd(range.from)) return false;
  if (range.to && ref > ymd(range.to)) return false;
  return true;
}

/** Pega a string YYYY-MM-DD do campo de referência. Cancelados fora de
 *  modo "criacao" usam data de cancelamento como referência (mantém a regra
 *  antiga). Em modo "criacao", sempre lead_created_at. */
function getRefDate(l: LeadClosed, dateRef: 'fechamento' | 'criacao'): string | null {
  if (dateRef === 'criacao') {
    return l.lead_created_at?.slice(0, 10) ?? null;
  }
  const ref = l.cancelado ? l.data_cancelamento_fmt : l.data_fechamento_fmt;
  return ref?.slice(0, 10) ?? null;
}

/** Filtragem unificada (legado): mistura ativos pela data_fechamento e
 *  cancelados pela data_cancelamento. Ainda usado pelas abas Vendedor /
 *  Astrônomo / Origem que esperam UMA lista. Pra o Overview e KPIs
 *  separados de cancelados, use `useFilteredAtivos` + `useFilteredCancelados`. */
export function useFilteredClosed(leads: LeadClosed[], filters: ClosedFilters) {
  return useMemo(() => {
    return leads.filter((l) => {
      if (filters.vendedores.length > 0 && !filters.vendedores.includes(l.vendedor || '')) return false;
      if (filters.astronomos.length > 0 && !filters.astronomos.includes(l.astronomo || '')) return false;
      if (filters.cancelado === 'sim' && !l.cancelado) return false;
      if (filters.cancelado === 'nao' && l.cancelado) return false;
      const ref = getRefDate(l, filters.dateRef);
      if (!ref) return false;
      return dateInRange(ref, filters.dateRange);
    });
  }, [leads, filters]);
}

/** Leads não-cancelados ("vendas fechadas") filtrados pela `data_fechamento_fmt`.
 *  Usado pelos KPIs principais do Overview (Total / Diárias / Faturamento)
 *  pra excluir leads cancelados independente de quando o cancelamento ocorreu.
 *  Em modo `dateRef='criacao'`, filtra por `lead_created_at`. */
export function useFilteredAtivos(leads: LeadClosed[], filters: ClosedFilters) {
  return useMemo(() => {
    if (filters.cancelado === 'sim') return []; // status=Cancelados → zera ativos
    return leads.filter((l) => {
      if (l.cancelado) return false;
      if (filters.vendedores.length > 0 && !filters.vendedores.includes(l.vendedor || '')) return false;
      if (filters.astronomos.length > 0 && !filters.astronomos.includes(l.astronomo || '')) return false;
      const ref = filters.dateRef === 'criacao'
        ? l.lead_created_at?.slice(0, 10) ?? null
        : l.data_fechamento_fmt?.slice(0, 10) ?? null;
      if (!ref) return false;
      return dateInRange(ref, filters.dateRange);
    });
  }, [leads, filters]);
}

/** Leads cancelados filtrados pela `data_cancelamento_fmt` (NÃO pela data
 *  de fechamento). Usado pelo KPI "Leads Cancelados" do Overview — um lead
 *  fechado em março e cancelado em abril aparece aqui ao filtrar abril,
 *  mesmo que sua data de fechamento esteja fora do período.
 *  Em modo `dateRef='criacao'`, filtra por `lead_created_at`. */
export function useFilteredCancelados(leads: LeadClosed[], filters: ClosedFilters) {
  return useMemo(() => {
    if (filters.cancelado === 'nao') return []; // status=Ativos → zera cancelados
    return leads.filter((l) => {
      if (!l.cancelado) return false;
      if (filters.vendedores.length > 0 && !filters.vendedores.includes(l.vendedor || '')) return false;
      if (filters.astronomos.length > 0 && !filters.astronomos.includes(l.astronomo || '')) return false;
      const ref = filters.dateRef === 'criacao'
        ? l.lead_created_at?.slice(0, 10) ?? null
        : l.data_cancelamento_fmt?.slice(0, 10) ?? null;
      if (!ref) return false;
      return dateInRange(ref, filters.dateRange);
    });
  }, [leads, filters]);
}
