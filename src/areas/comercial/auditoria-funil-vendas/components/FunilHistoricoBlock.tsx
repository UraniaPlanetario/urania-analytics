import { useMemo } from 'react';
import {
  FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { useFunnelData } from '../hooks/useFunilWhatsapp';
import { ETAPAS_FUNIL, type Filtros } from '../types';

interface Props {
  filtros: Filtros;
}

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

function fmtDays(d: number | null | undefined): string {
  if (d == null) return '—';
  return `${d.toFixed(1)}d`;
}

function fmtPct(num: number, total: number): string {
  if (total === 0) return '0%';
  return `${((num / total) * 100).toFixed(1)}%`;
}

/** Bloco de funis (Venda Ganha + Venda Perdida) e cards de tempo médio. */
export function FunilHistoricoBlock({ filtros }: Props) {
  const { data, isLoading } = useFunnelData(filtros);

  const etapasFiltradasNomes = useMemo(() => {
    if (filtros.etapas.length === 0) return null;
    return filtros.etapas
      .map((id) => ETAPAS_FUNIL.find((e) => e.status_id === id)?.status_name)
      .filter(Boolean)
      .join(', ');
  }, [filtros.etapas]);

  const semFiltroEtapa = filtros.etapas.length === 0;

  // Pra Recharts FunnelChart: rótulo "Passou pela etapa" só aparece se filtrou
  const dataGanha = useMemo(() => {
    if (!data) return [];
    if (semFiltroEtapa) {
      return [
        { name: 'Criados/movidos pra Vendas Whats', value: data.scope_total, fill: '#3b82f6' },
        { name: 'Venda Ganha', value: data.ganhos_total, fill: '#10b981' },
      ];
    }
    return [
      { name: 'Criados/movidos pra Vendas Whats', value: data.scope_total, fill: '#3b82f6' },
      { name: `Passou por ${etapasFiltradasNomes}`, value: data.passou_etapa_qtd, fill: '#8b5cf6' },
      { name: 'Venda Ganha após etapa', value: data.ganhos_apos_etapa, fill: '#10b981' },
    ];
  }, [data, semFiltroEtapa, etapasFiltradasNomes]);

  const dataPerdida = useMemo(() => {
    if (!data) return [];
    if (semFiltroEtapa) {
      return [
        { name: 'Criados/movidos pra Vendas Whats', value: data.scope_total, fill: '#3b82f6' },
        { name: 'Venda Perdida', value: data.perdidos_total, fill: '#ef4444' },
      ];
    }
    return [
      { name: 'Criados/movidos pra Vendas Whats', value: data.scope_total, fill: '#3b82f6' },
      { name: `Passou por ${etapasFiltradasNomes}`, value: data.passou_etapa_qtd, fill: '#8b5cf6' },
      { name: 'Venda Perdida após etapa', value: data.perdidos_apos_etapa, fill: '#ef4444' },
    ];
  }, [data, semFiltroEtapa, etapasFiltradasNomes]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Carregando funis...
      </div>
    );
  }

  const tempoEtapaLabel = semFiltroEtapa
    ? 'Tempo médio nas etapas (geral)'
    : `Tempo médio em ${etapasFiltradasNomes}`;
  const tempoGanhoLabel = semFiltroEtapa
    ? 'Tempo médio até fechamento'
    : `Tempo médio até fechamento após ${etapasFiltradasNomes}`;
  const tempoPerdaLabel = semFiltroEtapa
    ? 'Tempo médio até perda'
    : `Tempo médio até perda após ${etapasFiltradasNomes}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Funis e tempos médios</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {semFiltroEtapa
            ? 'Sem etapa filtrada: o funil mostra criados → ganho/perda. Selecione uma etapa pra ver "passou pela etapa filtrada" no meio.'
            : `Etapa filtrada: ${etapasFiltradasNomes}. Os números após a etapa contam só leads que ganharam/perderam APÓS entrarem nessa etapa.`}
        </p>
      </div>

      {/* Cards de tempo médio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card-glass p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-purple-500" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{tempoEtapaLabel}</p>
          </div>
          <p className="text-3xl font-bold mt-1 text-purple-500">{fmtDays(data.tempo_medio_etapa_dias)}</p>
        </div>
        <div className="card-glass p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-500" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{tempoGanhoLabel}</p>
          </div>
          <p className="text-3xl font-bold mt-1 text-emerald-500">{fmtDays(data.tempo_medio_ate_ganho_dias)}</p>
        </div>
        <div className="card-glass p-4 rounded-xl">
          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-rose-500" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{tempoPerdaLabel}</p>
          </div>
          <p className="text-3xl font-bold mt-1 text-rose-500">{fmtDays(data.tempo_medio_ate_perdido_dias)}</p>
        </div>
      </div>

      {/* Funis lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funil Venda Ganha */}
        <div className="card-glass p-4 rounded-xl">
          <p className="text-sm font-semibold mb-1 text-emerald-500">Funil — Venda Ganha</p>
          <p className="text-xs text-muted-foreground mb-3">
            {dataGanha[dataGanha.length - 1]?.value} ganhos = {fmtPct(dataGanha[dataGanha.length - 1]?.value ?? 0, data.scope_total)} dos criados
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip {...TOOLTIP_STYLE} />
              <Funnel dataKey="value" data={dataGanha} isAnimationActive>
                <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" fontSize={11} />
                <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
                {dataGanha.map((_, i) => <Cell key={i} fill={dataGanha[i].fill} />)}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Funil Venda Perdida */}
        <div className="card-glass p-4 rounded-xl">
          <p className="text-sm font-semibold mb-1 text-rose-500">Funil — Venda Perdida</p>
          <p className="text-xs text-muted-foreground mb-3">
            {dataPerdida[dataPerdida.length - 1]?.value} perdas = {fmtPct(dataPerdida[dataPerdida.length - 1]?.value ?? 0, data.scope_total)} dos criados
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip {...TOOLTIP_STYLE} />
              <Funnel dataKey="value" data={dataPerdida} isAnimationActive>
                <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" fontSize={11} />
                <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
                {dataPerdida.map((_, i) => <Cell key={i} fill={dataPerdida[i].fill} />)}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
