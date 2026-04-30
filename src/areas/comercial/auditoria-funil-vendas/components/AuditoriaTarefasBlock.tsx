import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid,
} from 'recharts';
import { ExternalLink } from 'lucide-react';
import type { LeadAtual } from '../hooks/useFunilWhatsapp';
import { kommoLeadUrl } from '../types';

interface Props {
  ativos: LeadAtual[];
}

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

/** Faixas de tempo: até 1 dia, até 2 dias, 3+ dias. Lê dias > 0
 *  (zero/negativo = sem nada vencido). */
function classificarFaixa(dias: number): 'até 1 dia' | 'até 2 dias' | '3+ dias' {
  if (dias <= 1) return 'até 1 dia';
  if (dias <= 2) return 'até 2 dias';
  return '3+ dias';
}

const FAIXAS_ORDER = ['até 1 dia', 'até 2 dias', '3+ dias'] as const;
const FAIXA_COLOR: Record<string, string> = {
  'até 1 dia':  '#facc15', // amarelo
  'até 2 dias': '#f97316', // laranja
  '3+ dias':    '#ef4444', // vermelho
};

function fmtDays(d: number | null | undefined): string {
  if (d == null) return '—';
  return d < 1 ? '<1d' : `${Math.floor(d)}d`;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

export function AuditoriaTarefasBlock({ ativos }: Props) {
  // Tarefas vencidas (dias_tarefa_vencida > 0)
  const vencidas = useMemo(
    () => ativos.filter((l) => (l.dias_tarefa_vencida ?? 0) > 0),
    [ativos],
  );
  // Sem tarefa aberta (tarefa_id IS NULL)
  const semTarefa = useMemo(
    () => ativos.filter((l) => l.tarefa_id == null),
    [ativos],
  );

  const distribVencidas = useMemo(() => {
    const counts: Record<string, number> = { 'até 1 dia': 0, 'até 2 dias': 0, '3+ dias': 0 };
    for (const l of vencidas) counts[classificarFaixa(l.dias_tarefa_vencida ?? 0)]++;
    return FAIXAS_ORDER.map((faixa) => ({ faixa, qtd: counts[faixa] }));
  }, [vencidas]);

  const distribSemTarefa = useMemo(() => {
    const counts: Record<string, number> = { 'até 1 dia': 0, 'até 2 dias': 0, '3+ dias': 0 };
    for (const l of semTarefa) {
      const dias = l.dias_sem_tarefa ?? 0;
      if (dias <= 0) continue;
      counts[classificarFaixa(dias)]++;
    }
    return FAIXAS_ORDER.map((faixa) => ({ faixa, qtd: counts[faixa] }));
  }, [semTarefa]);

  const tabelaVencidas = useMemo(
    () => [...vencidas].sort((a, b) => (b.dias_tarefa_vencida ?? 0) - (a.dias_tarefa_vencida ?? 0)).slice(0, 100),
    [vencidas],
  );
  const tabelaSemTarefa = useMemo(
    () => [...semTarefa]
      .filter((l) => (l.dias_sem_tarefa ?? 0) > 0)
      .sort((a, b) => (b.dias_sem_tarefa ?? 0) - (a.dias_sem_tarefa ?? 0))
      .slice(0, 100),
    [semTarefa],
  );

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Auditoria de Tarefas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Leads ativos cuja tarefa aberta venceu (não foi concluída no prazo) ou que estão sem nenhuma
          tarefa aberta. "Tempo sem tarefa" usa <code className="text-xs">lead.updated_at</code> como
          proxy — é um sinal de "nada aconteceu nesse lead há X dias", não a data exata da última conclusão.
        </p>
      </div>

      {/* 2 KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-glass p-4 rounded-xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Leads com tarefa vencida</p>
          <p className="text-3xl font-bold mt-1 text-rose-500">{vencidas.length}</p>
        </div>
        <div className="card-glass p-4 rounded-xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Leads sem tarefa</p>
          <p className="text-3xl font-bold mt-1 text-amber-500">{semTarefa.length}</p>
        </div>
      </div>

      {/* 2 gráficos lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-glass p-4 rounded-xl">
          <p className="text-sm font-semibold mb-3">Tarefas vencidas por faixa de tempo</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={distribVencidas}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="qtd">
                <LabelList dataKey="qtd" position="top" fill="hsl(var(--foreground))" fontSize={11} />
                {distribVencidas.map((d) => <Cell key={d.faixa} fill={FAIXA_COLOR[d.faixa]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-glass p-4 rounded-xl">
          <p className="text-sm font-semibold mb-3">Leads sem tarefa por faixa de tempo</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={distribSemTarefa}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="faixa" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="qtd">
                <LabelList dataKey="qtd" position="top" fill="hsl(var(--foreground))" fontSize={11} />
                {distribSemTarefa.map((d) => <Cell key={d.faixa} fill={FAIXA_COLOR[d.faixa]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela: tarefas vencidas (top 100, ordem desc por dias vencida) */}
      <div className="card-glass rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold">Tarefas vencidas — top 100 mais antigas</p>
          <p className="text-xs text-muted-foreground mt-1">
            Lead com tarefa aberta cujo prazo (<code className="text-xs">complete_till</code>) já passou.
          </p>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b z-10">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Lead</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Responsável</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Etapa atual</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Prazo</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Vencida há</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {tabelaVencidas.map((l) => (
                <tr key={l.lead_id} className="border-b border-border/40 hover:bg-accent/40">
                  <td className="py-1.5 px-3 truncate max-w-[260px]" title={l.lead_name ?? ''}>
                    {l.lead_name ?? `Lead #${l.lead_id}`}
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground">{l.responsible_user_name ?? '—'}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">{l.status_name ?? '—'}</td>
                  <td className="py-1.5 px-3 text-muted-foreground tabular-nums">{fmtDateTime(l.tarefa_complete_till)}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-medium text-rose-500">
                    {fmtDays(l.dias_tarefa_vencida)}
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <a href={kommoLeadUrl(l.lead_id)!} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1" title="Abrir no Kommo">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
              {tabelaVencidas.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma tarefa vencida no recorte.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela: leads sem tarefa */}
      <div className="card-glass rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold">Leads sem tarefa — top 100 mais esquecidos</p>
          <p className="text-xs text-muted-foreground mt-1">
            Leads ativos sem nenhuma tarefa aberta, ordenados pelo tempo desde a última atualização do lead.
          </p>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b z-10">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Lead</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Responsável</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Etapa atual</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Sem tarefa há</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {tabelaSemTarefa.map((l) => (
                <tr key={l.lead_id} className="border-b border-border/40 hover:bg-accent/40">
                  <td className="py-1.5 px-3 truncate max-w-[260px]" title={l.lead_name ?? ''}>
                    {l.lead_name ?? `Lead #${l.lead_id}`}
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground">{l.responsible_user_name ?? '—'}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">{l.status_name ?? '—'}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-medium text-amber-500">
                    {fmtDays(l.dias_sem_tarefa)}
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <a href={kommoLeadUrl(l.lead_id)!} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1" title="Abrir no Kommo">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
              {tabelaSemTarefa.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum lead sem tarefa no recorte.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
