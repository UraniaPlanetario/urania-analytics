import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { LeadClosed } from '../types';

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function diariasOf(l: LeadClosed): number {
  const n = parseInt(l.n_diarias || '0', 10);
  return isNaN(n) ? 0 : n;
}

interface Props {
  /** Leads não-cancelados filtrados pela `data_fechamento_fmt`. */
  ativos: LeadClosed[];
  /** Leads cancelados filtrados pela `data_cancelamento_fmt`. */
  cancelados: LeadClosed[];
}

export function OverviewBlock({ ativos, cancelados }: Props) {
  const stats = useMemo(() => {
    const total = ativos.length;
    const receita = ativos.reduce((s, l) => s + (l.lead_price || 0), 0);
    const totalDiarias = ativos.reduce((s, l) => s + diariasOf(l), 0);
    const ticketMedio = totalDiarias > 0 ? receita / totalDiarias : 0;
    return { total, receita, ticketMedio, totalDiarias };
  }, [ativos]);

  // Diárias por mês — usa só ativos pela data de fechamento (gráfico
  // representa "diárias fechadas no mês" sem cancelados).
  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of ativos) {
      const dateStr = l.data_fechamento_fmt;
      const d = dateStr ? new Date(dateStr) : null;
      if (!d || isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + diariasOf(l);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const label = `${MONTH_LABELS[Number(month)]}/${year.slice(2)}`;
        return { name: label, value };
      });
  }, [ativos]);

  return (
    <div className="space-y-6">
      {/* KPIs principais (sem cancelados) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Total de Leads Fechados</p>
          <p className="text-3xl font-bold text-foreground">{stats.total.toLocaleString('pt-BR')}</p>
        </div>
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Total de Diárias Fechadas</p>
          <p className="text-3xl font-bold text-foreground">{stats.totalDiarias.toLocaleString('pt-BR')}</p>
        </div>
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Receita Total</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(stats.receita)}</p>
        </div>
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Ticket Médio por Diária</p>
          <p className="text-xl font-bold text-foreground">{formatCurrency(stats.ticketMedio)}</p>
        </div>
      </div>

      {/* KPI separado pra cancelados — filtrado por data de cancelamento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-glass p-4 rounded-xl text-center border border-rose-500/30">
          <p className="text-sm text-muted-foreground">Leads Cancelados</p>
          <p className="text-3xl font-bold text-rose-500">{cancelados.length.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1 italic">
            *No período filtrado pela data de cancelamento
          </p>
        </div>
      </div>

      {/* Diárias por Mês */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">Diárias Fechadas por Mês</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byMonth} margin={{ left: 10, right: 10, top: 20 }}>
            <XAxis dataKey="name" stroke="hsl(240, 5%, 65%)" tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 12 }} />
            <YAxis stroke="hsl(240, 5%, 65%)" tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 12 }} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Diárias']} />
            <Bar dataKey="value" fill="hsl(263, 70%, 58%)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="value" position="top" fill="hsl(240, 5%, 65%)" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
