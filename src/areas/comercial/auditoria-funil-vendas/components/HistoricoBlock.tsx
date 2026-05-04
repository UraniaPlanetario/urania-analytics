import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid,
} from 'recharts';
import { Loader2, Info } from 'lucide-react';
import { useEtapaStats, useKpisHistorico, diasNoPeriodo } from '../hooks/useFunilWhatsapp';
import { ETAPAS_FUNIL, STATUS_CLOSED_WON, STATUS_CLOSED_LOST, type Filtros } from '../types';
import { FunilHistoricoBlock } from './FunilHistoricoBlock';

interface Props {
  filtros: Filtros;
}

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

const PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#a855f7', '#ef4444', '#84cc16', '#f97316',
  '#14b8a6', '#0ea5e9', '#d946ef', '#22c55e', '#eab308',
  '#6366f1', '#facc15', '#94a3b8', '#dc2626', '#65a30d',
];

export function HistoricoBlock({ filtros }: Props) {
  const { data: kpis, isLoading: kpisLoading } = useKpisHistorico(filtros);
  const { data: etapaStats = [], isLoading: statsLoading } = useEtapaStats(filtros);

  const dias = diasNoPeriodo(filtros);
  const periodoCompleto = filtros.dateRange.from != null && filtros.dateRange.to != null;

  // Stats por etapa indexado pra acesso rápido
  const statsByStatus = useMemo(() => {
    const m = new Map<number, typeof etapaStats[number]>();
    for (const s of etapaStats) m.set(Number(s.status_id), s);
    return m;
  }, [etapaStats]);

  // Eixo X comum: etapas do funil em ordem (excluindo won — sempre 0 nesse pipeline)
  const etapasOrdem = useMemo(() => {
    return ETAPAS_FUNIL.filter((e) => e.status_id !== STATUS_CLOSED_WON);
  }, []);

  // Dataset: passagem por etapa
  const dataPassagem = useMemo(() => {
    return etapasOrdem
      .map((e) => ({
        etapa: e.status_name,
        qtd: statsByStatus.get(e.status_id)?.passagem_qtd ?? 0,
      }))
      .filter((d) => d.qtd > 0);
  }, [etapasOrdem, statsByStatus]);

  const dataTempoMedio = useMemo(() => {
    return etapasOrdem
      .filter((e) => e.status_id !== STATUS_CLOSED_LOST) // tempo em "lost" não é informativo
      .map((e) => {
        const s = statsByStatus.get(e.status_id);
        return {
          etapa: e.status_name,
          dias: s?.tempo_medio_dias != null ? Number(s.tempo_medio_dias) : 0,
        };
      })
      .filter((d) => d.dias > 0);
  }, [etapasOrdem, statsByStatus]);

  // Dataset: 24h pra criados/hora (preencher horas vazias)
  const dataPorHora = useMemo(() => {
    if (!kpis) return [];
    const map = new Map(kpis.porHora.map((h) => [h.hora, h.total]));
    return Array.from({ length: 24 }, (_, h) => {
      const total = map.get(h) ?? 0;
      return {
        hora: `${String(h).padStart(2, '0')}h`,
        total,
        media: dias ? +(total / dias).toFixed(2) : total,
      };
    });
  }, [kpis, dias]);

  if (kpisLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Carregando análise histórica...
      </div>
    );
  }

  if (!periodoCompleto) {
    return (
      <div className="card-glass p-12 rounded-xl text-center">
        <p className="text-lg font-semibold text-foreground">Selecione um período</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          A aba Histórico precisa de um intervalo de datas no filtro acima pra calcular
          passagem por etapa, tempo médio e demais métricas do período.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-glass p-4 rounded-xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Leads criados no período</p>
          <p className="text-3xl font-bold mt-1">{kpis?.criados_total.toLocaleString('pt-BR') ?? '—'}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">Criação direta + entrada vinda de outro pipeline</p>
        </div>
        <div className="card-glass p-4 rounded-xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Leads perdidos no período</p>
          <p className="text-3xl font-bold mt-1 text-rose-500">{kpis?.perdidos_total.toLocaleString('pt-BR') ?? '—'}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">Movidos pra Closed - lost (do scope)</p>
        </div>
        <div className="card-glass p-4 rounded-xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Dias no período</p>
          <p className="text-3xl font-bold mt-1">{dias ?? '—'}</p>
        </div>
        <div className="card-glass p-4 rounded-xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Média criados/dia</p>
          <p className="text-3xl font-bold mt-1 text-primary">
            {kpis && dias ? Math.round(kpis.criados_total / dias).toLocaleString('pt-BR') : '—'}
          </p>
        </div>
      </div>

      {/* Passagem por etapa */}
      <div className="card-glass p-4 rounded-xl">
        <p className="text-sm font-semibold mb-1">Passagem por etapa</p>
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
          <Info size={11} /> Quantos leads (criados no período) passaram por cada etapa do funil — leads podem aparecer em mais de uma.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dataPassagem} margin={{ bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="etapa" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} height={70} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="qtd">
              <LabelList dataKey="qtd" position="top" fill="hsl(var(--foreground))" fontSize={10} />
              {dataPassagem.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tempo médio na etapa */}
      <div className="card-glass p-4 rounded-xl">
        <p className="text-sm font-semibold mb-1">Tempo médio na etapa (dias)</p>
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
          <Info size={11} /> Média de dias que cada lead passa em cada etapa (se ainda está, conta até hoje).
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={dataTempoMedio} margin={{ bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="etapa" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} height={70} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${Number(v).toFixed(1)}d`, 'Tempo médio']} />
            <Bar dataKey="dias" fill="#8b5cf6">
              <LabelList
                dataKey="dias"
                position="top"
                formatter={(v: any) => `${Number(v).toFixed(1)}d`}
                fill="hsl(var(--foreground))"
                fontSize={10}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Criados por hora — média + total lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-glass p-4 rounded-xl">
          <p className="text-sm font-semibold mb-1">Média de leads criados por hora</p>
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <Info size={11} /> Total da hora ÷ {dias} dias do período. Útil pra ver concentração ao longo do dia.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataPorHora}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} interval={1} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [Number(v).toFixed(2), 'Média']} />
              <Bar dataKey="media" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-glass p-4 rounded-xl">
          <p className="text-sm font-semibold mb-1">Total de leads criados por hora</p>
          <p className="text-xs text-muted-foreground mb-3">Soma de todos os leads criados em cada hora ao longo do período.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dataPorHora}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} interval={1} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funis Ganha/Perdida + cards de tempo médio (fase 6) */}
      <FunilHistoricoBlock filtros={filtros} />
    </div>
  );
}
