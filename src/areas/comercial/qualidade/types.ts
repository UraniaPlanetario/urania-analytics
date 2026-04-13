export interface LeadQuality {
  id: number;
  kommo_lead_id: number;
  lead_name: string | null;
  lead_price: number | null;
  pipeline_name: string | null;
  status_name: string | null;
  responsible_user: string | null;
  created_at_kommo: string | null;
  dia_semana_criacao: string | null;
  tipo_de_dia: string | null;
  faixa_horario_criacao: string | null;
  quem_atendeu_primeiro: string | null;
  qualidade_abordagem_inicial: string | null;
  personalizacao_atendimento: string | null;
  clareza_comunicacao: string | null;
  conectou_solucao_necessidade: string | null;
  explicou_beneficios: string | null;
  personalizou_argumentacao: string | null;
  houve_desconto: string | null;
  desconto_justificado: string | null;
  quebrou_preco_sem_necessidade: string | null;
  retorno_etapa_funil: string | null;
  retorno_resgate: string | null;
  tempo_primeira_resposta: string | null;
  pediu_data: string | null;
  data_sugerida: string | null;
  dias_ate_fechar: string | null;
  ligacoes_feitas: string | null;
  conhecia_urania: string | null;
  proximo_passo_definido: string | null;
  observacoes_gerais: string | null;
  ponto_critico: string | null;
  ponto_positivo: string | null;
  score_qualidade: string | null;
  vendedor_consultor: string | null;
  sdr: string | null;
  cidade_estado: string | null;
  etapa_funil: string | null;
  tipo_cliente: string | null;
  data_fechamento: string | null;
  data_hora_agendamento: string | null;
  produtos: string | null;
  closed_at_kommo: string | null;
  synced_at: string | null;
  updated_at: string | null;
}

export interface Filters {
  vendedores: string[];
  dateRange: { from: Date | null; to: Date | null };
  closeDateRange: { from: Date | null; to: Date | null };
  scores: string[];
}

export const SCORE_MAP: Record<string, number> = {
  '90–100 → Excelente': 95,
  '75–89 → Bom': 82,
  '60–74 → Regular': 67,
  '<60 → Crítico': 40,
};

export const SCORE_LABELS: Record<string, string> = {
  '90–100 → Excelente': 'Excelente',
  '75–89 → Bom': 'Bom',
  '60–74 → Regular': 'Regular',
  '<60 → Crítico': 'Crítico',
};

export const SCORE_OPTIONS = [
  '90–100 → Excelente',
  '75–89 → Bom',
  '60–74 → Regular',
  '<60 → Crítico',
];

export const SCORE_COLORS: Record<string, string> = {
  '90–100 → Excelente': 'hsl(142, 71%, 30%)',
  '75–89 → Bom': 'hsl(142, 60%, 50%)',
  '60–74 → Regular': 'hsl(45, 93%, 47%)',
  '<60 → Crítico': 'hsl(0, 72%, 51%)',
};

export const DAY_ORDER = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const TEMPO_RESPOSTA_ORDER = ['1 > 5', '5 > 10', '10+', '20+', '30+'];
export const DIAS_FECHAR_ORDER = ['1 > 5', '5 > 10', '10+', '20+', '30+', '40+', '50+', '60+'];
export const LIGACOES_ORDER = ['Não', '01', '02', '03', '04', '05+'];
