/** Auditoria do Funil de Vendas WhatsApp.
 *
 *  Escopo: leads que foram **criados** ou **movidos** para o pipeline
 *  "Vendas WhatsApp" (pipeline_id 10832516). As 20 etapas estão listadas em
 *  `ETAPAS_FUNIL` na ordem do funil (sort do Kommo).
 *
 *  "Vendedor" do lead = custom field `Vendedor/Consultor` (texto livre, não
 *  é o `responsible_user_id` do lead). Auditorias de divergência comparam:
 *    - lead.responsible × lead.custom_fields.'Vendedor/Consultor'
 *    - lead.responsible × task.responsible (tarefa aberta no lead)
 *
 *  "Venda perdida" = somente `status_id = 143` (Closed - lost). A etapa
 *  intermediária "Cancelado" (99553555) NÃO é tratada como perdida — quando
 *  um lead nessa etapa é movido para Closed-lost, é aí que vira perdido.
 */

export const PIPELINE_VENDAS_WHATS_ID = 10832516;
export const PIPELINE_VENDAS_WHATS_NAME = 'Vendas WhatsApp';

export const STATUS_CLOSED_WON  = 142;
export const STATUS_CLOSED_LOST = 143;

/** Lista ordenada das 20 etapas do funil (sort crescente do Kommo). */
export interface EtapaFunil {
  status_id: number;
  status_name: string;
  sort: number;
}

export const ETAPAS_FUNIL: EtapaFunil[] = [
  { status_id: 83066856,  status_name: 'Incoming leads',          sort: 10   },
  { status_id: 95364220,  status_name: 'Saudação sem IA',         sort: 20   },
  { status_id: 99618623,  status_name: 'Saudação Manual',         sort: 30   },
  { status_id: 99425707,  status_name: 'Oportunidade Reativada',  sort: 40   },
  { status_id: 94562692,  status_name: 'C1 - Impacto',            sort: 50   },
  { status_id: 94563184,  status_name: 'C2 - Reforço',            sort: 60   },
  { status_id: 94563796,  status_name: 'C3 - Gancho',             sort: 70   },
  { status_id: 94564136,  status_name: 'C4 - Humor',              sort: 80   },
  { status_id: 94585440,  status_name: 'C5 - Encerramento',       sort: 90   },
  { status_id: 99558275,  status_name: 'LD - Redistribuir',       sort: 100  },
  { status_id: 83066864,  status_name: 'Qualificado IA Whats',    sort: 110  },
  { status_id: 100952455, status_name: 'Qualificado SDR',         sort: 120  },
  { status_id: 99553543,  status_name: 'Falar com Direção/Decisor', sort: 130 },
  { status_id: 99553547,  status_name: 'Negociação',              sort: 140  },
  { status_id: 94601768,  status_name: 'Geladeira',               sort: 150  },
  { status_id: 99553551,  status_name: 'Venda provável',          sort: 160  },
  { status_id: 99553979,  status_name: 'Pré-reserva',             sort: 170  },
  { status_id: 99553555,  status_name: 'Cancelado',               sort: 180  },
  { status_id: 142,       status_name: 'Closed - won',            sort: 10000 },
  { status_id: 143,       status_name: 'Closed - lost',           sort: 11000 },
];

/** Status IDs que indicam lead ATIVO (não fechado pra ganha/perdida). Usado
 *  pra filtrar "leads ativos" em todas as visualizações da aba Hoje. */
export const STATUS_ATIVOS_IDS = ETAPAS_FUNIL
  .filter((e) => e.status_id !== STATUS_CLOSED_WON && e.status_id !== STATUS_CLOSED_LOST)
  .map((e) => e.status_id);

export interface Filtros {
  /** Etapas selecionadas (status_id). Vazio = todas. Aplicado nas duas abas. */
  etapas: number[];
  /** Responsáveis (responsible_user_name). Vazio = todos. Aplicado nas duas abas. */
  responsaveis: string[];
  /** Período de criação do lead. Aplicado SÓ na aba Histórico. */
  dateRange: { from: Date | null; to: Date | null };
}

export const FILTROS_DEFAULT: Filtros = {
  etapas: [],
  responsaveis: [],
  dateRange: { from: null, to: null },
};

/** Formata segundos em "X dias" / "X horas" / "X min" pra exibição compacta. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '—';
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours}h`;
  const mins = Math.floor(seconds / 60);
  return `${mins}min`;
}

export function statusName(statusId: number | null | undefined): string {
  if (statusId == null) return '—';
  return ETAPAS_FUNIL.find((e) => e.status_id === statusId)?.status_name ?? `#${statusId}`;
}

export function kommoLeadUrl(leadId: number | null | undefined): string | null {
  if (leadId == null) return null;
  return `https://uraniaplanetario.kommo.com/leads/detail/${leadId}`;
}
