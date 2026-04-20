import { useMemo } from 'react';
import { Loader2, Info } from 'lucide-react';
import {
  useActiveConsultores,
  useOpenLeads,
  useClosedLeadsPeriodo,
  useOpenTasks,
  useCamposAlteradosFiltered,
} from '../hooks/useConsistenciaData';
import {
  UserActivity,
  FIM_FUNIL_ESTAGIOS,
  ConsistenciaVendedor,
  classifyConsistencia,
  CLASSIFICACAO_COLORS,
  ClassificacaoCRM,
} from '../types';

const EXCLUDED_CATEGORIES = new Set(['Tag', 'Vinculacao', 'Outros', 'Campo alterado']);

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

interface Props {
  activities: UserActivity[];
  dateRange: { from: Date; to: Date };
}

export function ConsistenciaCRMBlock({ activities, dateRange }: Props) {
  const fromStr = toDateStr(dateRange.from);
  const toStr = toDateStr(dateRange.to);

  const { data: consultores = [], isLoading: loadingUsers } = useActiveConsultores();
  const { data: openLeads = [], isLoading: loadingLeads } = useOpenLeads();
  const { data: closedLeads = [], isLoading: loadingClosed } = useClosedLeadsPeriodo(fromStr, toStr);
  const { data: openTasks = [], isLoading: loadingTasks } = useOpenTasks();
  const { data: camposFiltered = {}, isLoading: loadingCampos } = useCamposAlteradosFiltered(fromStr, toStr);

  const rows = useMemo<ConsistenciaVendedor[]>(() => {
    if (consultores.length === 0) return [];

    const idByName = new Map<string, number>();
    for (const u of consultores) idByName.set(u.name, u.id);

    const leadsPorVendedor = new Map<number, { total: number; fimFunilIds: Set<number> }>();
    for (const u of consultores) {
      leadsPorVendedor.set(u.id, { total: 0, fimFunilIds: new Set() });
    }
    for (const l of openLeads) {
      if (!l.vendedor) continue;
      const uid = idByName.get(l.vendedor);
      if (uid == null) continue;
      const bucket = leadsPorVendedor.get(uid)!;
      bucket.total += 1;
      if (l.estagio_atual && FIM_FUNIL_ESTAGIOS.includes(l.estagio_atual)) {
        bucket.fimFunilIds.add(l.id_lead);
      }
    }

    const closedCount = new Map<number, number>();
    for (const c of closedLeads) {
      if (!c.vendedor) continue;
      const uid = idByName.get(c.vendedor);
      if (uid == null) continue;
      closedCount.set(uid, (closedCount.get(uid) || 0) + 1);
    }

    const tasksPorVendedor = new Map<
      number,
      { overdue: number; leadsWithTask: Set<number>; leadsOverdueTask: Set<number> }
    >();
    for (const u of consultores) {
      tasksPorVendedor.set(u.id, {
        overdue: 0,
        leadsWithTask: new Set(),
        leadsOverdueTask: new Set(),
      });
    }
    const now = Date.now();
    for (const t of openTasks) {
      if (t.responsible_user_id == null) continue;
      const bucket = tasksPorVendedor.get(t.responsible_user_id);
      if (!bucket) continue;
      if (t.entity_id != null) bucket.leadsWithTask.add(t.entity_id);
      const completeMs = t.complete_till ? new Date(t.complete_till).getTime() : null;
      if (completeMs != null && completeMs < now) {
        bucket.overdue += 1;
        if (t.entity_id != null) bucket.leadsOverdueTask.add(t.entity_id);
      }
    }

    const acoesPorVendedor = new Map<number, number>();
    for (const a of activities) {
      if (EXCLUDED_CATEGORIES.has(a.category)) continue;
      const uid = a.user_id;
      acoesPorVendedor.set(uid, (acoesPorVendedor.get(uid) || 0) + a.activity_count);
    }
    for (const [uidStr, count] of Object.entries(camposFiltered)) {
      const uid = Number(uidStr);
      acoesPorVendedor.set(uid, (acoesPorVendedor.get(uid) || 0) + count);
    }

    const out: ConsistenciaVendedor[] = [];
    for (const u of consultores) {
      const leadsBucket = leadsPorVendedor.get(u.id)!;
      const tasksBucket = tasksPorVendedor.get(u.id)!;
      const openLeadIds = new Set<number>();
      for (const l of openLeads) {
        if (l.vendedor && idByName.get(l.vendedor) === u.id) openLeadIds.add(l.id_lead);
      }
      let semTarefa = 0;
      for (const lid of openLeadIds) {
        if (!tasksBucket.leadsWithTask.has(lid)) semTarefa += 1;
      }
      let atrasoFimFunil = 0;
      for (const lid of leadsBucket.fimFunilIds) {
        if (tasksBucket.leadsOverdueTask.has(lid)) atrasoFimFunil += 1;
      }
      const acoes = acoesPorVendedor.get(u.id) || 0;
      const acoesPorLead = leadsBucket.total > 0 ? acoes / leadsBucket.total : 0;
      out.push({
        user_id: u.id,
        user_name: u.name,
        leads_abertos: leadsBucket.total,
        leads_fechados_periodo: closedCount.get(u.id) || 0,
        tarefas_em_atraso: tasksBucket.overdue,
        sem_tarefa: semTarefa,
        atraso_fim_funil: atrasoFimFunil,
        acoes_periodo: acoes,
        acoes_por_lead: acoesPorLead,
        classificacao: classifyConsistencia(acoesPorLead),
      });
    }
    return out.sort((a, b) => b.acoes_por_lead - a.acoes_por_lead);
  }, [consultores, openLeads, closedLeads, openTasks, activities, camposFiltered]);

  const summary = useMemo(() => {
    const counts: Record<ClassificacaoCRM, number> = {
      'Boa': 0,
      'Moderada': 0,
      'Baixa': 0,
      'Extremamente Baixa': 0,
    };
    for (const r of rows) counts[r.classificacao] += 1;
    return counts;
  }, [rows]);

  const loading = loadingUsers || loadingLeads || loadingClosed || loadingTasks || loadingCampos;
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-glass p-4 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="text-primary flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Como o score é calculado</p>
            <p>
              <strong>Score = Ações no período ÷ Leads abertos</strong>. Leads abertos = snapshot
              atual de leads no pipeline <strong>Vendas WhatsApp</strong>, status "Em andamento"
              (não fechados/perdidos/cancelados), atribuídos a Consultores Inbound ativos.
              Classificação por faixas fixas:
            </p>
            <ul className="mt-2 space-y-0.5">
              <li>
                <span className="font-medium" style={{ color: CLASSIFICACAO_COLORS['Boa'] }}>
                  Boa
                </span>{' '}
                ≥ 3,0 ações/lead
              </li>
              <li>
                <span className="font-medium" style={{ color: CLASSIFICACAO_COLORS['Moderada'] }}>
                  Moderada
                </span>{' '}
                1,5 – 3,0
              </li>
              <li>
                <span className="font-medium" style={{ color: CLASSIFICACAO_COLORS['Baixa'] }}>
                  Baixa
                </span>{' '}
                0,7 – 1,5
              </li>
              <li>
                <span
                  className="font-medium"
                  style={{ color: CLASSIFICACAO_COLORS['Extremamente Baixa'] }}
                >
                  Extremamente Baixa
                </span>{' '}
                &lt; 0,7
              </li>
            </ul>
            <p className="mt-2 text-xs">
              Tarefas em atraso, sem tarefa e atraso em fim de funil (Negociação, Geladeira, Venda
              provável, Falar com Direção/Decisor) são <em>snapshot atual</em> — informativos, fora
              do score.
            </p>
            <p className="mt-1 text-xs">
              Ações contadas: mensagens, movimentações, ligações, notas, tarefas e campos alterados
              (excluindo 6 campos automatizados por bots: Etapa do funil, Parar IA WhatsApp/Instagram,
              Origem da oportunidade, Canal de entrada, tracking 586018). Categorias Tag, Vinculação
              e Outros excluídas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['Boa', 'Moderada', 'Baixa', 'Extremamente Baixa'] as ClassificacaoCRM[]).map((c) => (
          <div key={c} className="card-glass p-4 rounded-xl text-center">
            <p className="text-sm text-muted-foreground">{c}</p>
            <p
              className="text-3xl font-bold"
              style={{ color: CLASSIFICACAO_COLORS[c] }}
            >
              {summary[c]}
            </p>
            <p className="text-xs text-muted-foreground mt-1">vendedores</p>
          </div>
        ))}
      </div>

      <div className="card-glass p-4 rounded-xl overflow-x-auto">
        <h3 className="text-base font-semibold text-foreground mb-4">Consistência por Vendedor</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-medium">
              <th className="text-left py-2 px-3">Vendedor</th>
              <th className="text-right py-2 px-3">Leads Abertos</th>
              <th className="text-right py-2 px-3">Fechados no Período</th>
              <th className="text-right py-2 px-3">Tarefas em Atraso</th>
              <th className="text-right py-2 px-3">Sem Tarefa</th>
              <th className="text-right py-2 px-3">Atraso Fim de Funil</th>
              <th className="text-right py-2 px-3">Ações no Período</th>
              <th className="text-right py-2 px-3">Ações/Lead</th>
              <th className="text-left py-2 px-3">Classificação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.user_id}
                className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <td className="py-2 px-3 text-foreground font-medium">{r.user_name}</td>
                <td className="py-2 px-3 text-right text-foreground">
                  {r.leads_abertos.toLocaleString('pt-BR')}
                </td>
                <td className="py-2 px-3 text-right text-foreground">
                  {r.leads_fechados_periodo.toLocaleString('pt-BR')}
                </td>
                <td className="py-2 px-3 text-right text-foreground">
                  {r.tarefas_em_atraso.toLocaleString('pt-BR')}
                </td>
                <td className="py-2 px-3 text-right text-foreground">
                  {r.sem_tarefa.toLocaleString('pt-BR')}
                </td>
                <td className="py-2 px-3 text-right text-foreground">
                  {r.atraso_fim_funil.toLocaleString('pt-BR')}
                </td>
                <td className="py-2 px-3 text-right text-foreground">
                  {r.acoes_periodo.toLocaleString('pt-BR')}
                </td>
                <td className="py-2 px-3 text-right text-foreground font-medium">
                  {r.acoes_por_lead.toFixed(2).replace('.', ',')}
                </td>
                <td className="py-2 px-3">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: CLASSIFICACAO_COLORS[r.classificacao] + '33',
                      color: CLASSIFICACAO_COLORS[r.classificacao],
                    }}
                  >
                    {r.classificacao}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ConsistenciaCRMBlock;
