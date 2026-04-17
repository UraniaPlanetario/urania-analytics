export interface LeadClosed {
  id: number;
  lead_id: number;
  lead_name: string | null;
  lead_price: number | null;
  vendedor: string | null;
  sdr: string | null;
  cidade_estado: string | null;
  tipo_cliente: string | null;
  produtos: string | null;
  data_fechamento: string | null;
  data_agendamento: string | null;
  data_fechamento_fmt: string | null;
  data_agendamento_fmt: string | null;
  data_cancelamento_fmt: string | null;
  n_diarias: string | null;
  faixa_alunos: string | null;
  n_alunos: string | null;
  canal_entrada: string | null;
  origem_oportunidade: string | null;
  experiencia: string | null;
  conteudo_apresentacao: string | null;
  horizonte_agendamento: string | null;
  astronomo: string | null;
  turnos_evento: string | null;
  brinde: string | null;
  pipeline_origem: string | null;
  pipeline_onboarding: string | null;
  entrada_onboarding_at: string;
  lead_created_at: string | null;
  occurrence: number;
  cancelado: boolean;
  cancelado_at: string | null;
  custom_fields: Record<string, any> | null;
}

export interface ClosedFilters {
  vendedores: string[];
  astronomos: string[];
  cancelado: 'all' | 'sim' | 'nao';
  dateRange: { from: Date | null; to: Date | null };
}

export function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTimeBR(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
