export interface UserActivity {
  user_id: number;
  user_name: string;
  role_name: string | null;
  activity_date: string;
  activity_hour: number;
  event_type: string;
  category: string;
  entity_type: string | null;
  activity_count: number;
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Mensagem Enviada': 'hsl(263, 70%, 58%)',  // purple
  'Tarefa': 'hsl(270, 50%, 70%)',            // lilac
  'Nota': 'hsl(45, 80%, 55%)',              // gold
  'Movimentacao': 'hsl(142, 60%, 50%)',      // green
  'Campo alterado': 'hsl(200, 70%, 55%)',    // blue
  'Tag': 'hsl(320, 60%, 55%)',              // pink
  'Conversa': 'hsl(180, 60%, 50%)',          // cyan
  'Ligacao': 'hsl(15, 80%, 55%)',            // orange
  'E-mail': 'hsl(0, 72%, 51%)',              // red
  'Vinculacao': 'hsl(240, 40%, 60%)',        // indigo
  'Contato/Empresa': 'hsl(30, 60%, 55%)',    // brown
  'Outros': 'hsl(240, 5%, 50%)',             // gray
};

export interface MonitoringFilters {
  users: string[];
  categories: string[];
  roles: string[];
  dateRange: { from: Date | null; to: Date | null };
}

export const FIM_FUNIL_ESTAGIOS = [
  'Negociação',
  'Geladeira',
  'Venda provável',
  'Falar com Direção/Decisor',
];

export type ClassificacaoCRM = 'Boa' | 'Moderada' | 'Baixa' | 'Extremamente Baixa';

export interface ConsistenciaVendedor {
  user_id: number;
  user_name: string;
  leads_abertos: number;
  leads_fechados_periodo: number;
  tarefas_em_atraso: number;
  sem_tarefa: number;
  atraso_fim_funil: number;
  acoes_periodo: number;
  acoes_por_lead: number;
  classificacao: ClassificacaoCRM;
}

export function classifyConsistencia(acoesPorLead: number): ClassificacaoCRM {
  if (acoesPorLead >= 3.0) return 'Boa';
  if (acoesPorLead >= 1.5) return 'Moderada';
  if (acoesPorLead >= 0.7) return 'Baixa';
  return 'Extremamente Baixa';
}

export const CLASSIFICACAO_COLORS: Record<ClassificacaoCRM, string> = {
  'Boa': 'hsl(142, 60%, 50%)',
  'Moderada': 'hsl(45, 80%, 55%)',
  'Baixa': 'hsl(25, 80%, 55%)',
  'Extremamente Baixa': 'hsl(0, 72%, 51%)',
};
