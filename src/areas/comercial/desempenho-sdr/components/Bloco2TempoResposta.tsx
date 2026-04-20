import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  MensagemSDR,
  SDR,
  FAIXAS_TEMPO,
  calcNotaTempo,
  formatNumber,
  formatPct,
} from '../types';
import { TOOLTIP_STYLE, COLORS, SERIES_COLORS, filterToSDRs } from './_helpers';

interface Props {
  mensagens: MensagemSDR[];
  sdrs: SDR[];
}

export function Bloco2TempoResposta({ mensagens, sdrs }: Props) {
  const sdrNames = useMemo(() => new Set(sdrs.map((s) => s.nome)), [sdrs]);

  const filtered = useMemo(
    () => filterToSDRs(mensagens, sdrNames, (m) => m.responder_user_name),
    [mensagens, sdrNames],
  );

  // 2.1 / 2.2 — contagem total e % por faixa
  const totalPorFaixa = useMemo(() => {
    const totals = Object.fromEntries(FAIXAS_TEMPO.map((f) => [f, 0])) as Record<string, number>;
    for (const m of filtered) {
      if (m.faixa in totals) totals[m.faixa] += 1;
    }
    const totalGeral = Object.values(totals).reduce((s, v) => s + v, 0);
    return FAIXAS_TEMPO.map((f) => ({
      faixa: f,
      count: totals[f],
      pct: totalGeral > 0 ? (totals[f] / totalGeral) * 100 : 0,
    }));
  }, [filtered]);

  // 2.3 / 2.4 / 2.5 — por SDR
  const porSdr = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const m of filtered) {
      const name = m.responder_user_name!;
      if (!map[name]) {
        map[name] = Object.fromEntries(FAIXAS_TEMPO.map((f) => [f, 0]));
      }
      if (m.faixa in map[name]) map[name][m.faixa] += 1;
    }
    const rows = Object.entries(map).map(([sdr, faixaCounts]) => {
      const total = Object.values(faixaCounts).reduce((s, v) => s + v, 0);
      const nota = calcNotaTempo(faixaCounts);
      return { sdr, faixaCounts, total, nota };
    });
    return rows.sort((a, b) => b.nota - a.nota);
  }, [filtered]);

  // Dados para 2.3 (contagem por SDR agrupado por faixa)
  const porSdrCount = useMemo(() => {
    return porSdr.map((r) => {
      const row: Record<string, any> = { sdr: r.sdr };
      for (const f of FAIXAS_TEMPO) row[f] = r.faixaCounts[f] || 0;
      return row;
    });
  }, [porSdr]);

  // Dados para 2.4 (% por SDR agrupado por faixa)
  const porSdrPct = useMemo(() => {
    return porSdr.map((r) => {
      const row: Record<string, any> = { sdr: r.sdr };
      for (const f of FAIXAS_TEMPO) {
        row[f] = r.total > 0 ? ((r.faixaCounts[f] || 0) / r.total) * 100 : 0;
      }
      return row;
    });
  }, [porSdr]);

  // Dados para 2.5 (nota por SDR)
  const notaPorSdr = useMemo(
    () => porSdr.map((r) => ({ sdr: r.sdr, nota: Number(r.nota.toFixed(2)) })),
    [porSdr],
  );

  if (filtered.length === 0) {
    return (
      <div className="card-glass p-8 rounded-xl text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma mensagem de SDR no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 2.1 e 2.2 lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2.1 — contagem total por faixa (horizontal) */}
        <div className="card-glass p-4 rounded-xl">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Total de Mensagens por Faixa
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={totalPorFaixa}
              layout="vertical"
              margin={{ left: 20, right: 40, top: 10, bottom: 10 }}
            >
              <CartesianGrid stroke="hsl(240, 4%, 16%)" horizontal={false} />
              <XAxis
                type="number"
                stroke={COLORS.muted}
                tick={{ fill: COLORS.muted, fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="faixa"
                stroke={COLORS.muted}
                tick={{ fill: COLORS.muted, fontSize: 12 }}
                width={80}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number) => [formatNumber(value), 'Mensagens']}
              />
              <Bar dataKey="count" fill={COLORS.purple} radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="count"
                  position="right"
                  fill={COLORS.muted}
                  fontSize={11}
                  formatter={(v: number) => formatNumber(v)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 2.2 — % por faixa (horizontal) */}
        <div className="card-glass p-4 rounded-xl">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Distribuição % por Faixa
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={totalPorFaixa}
              layout="vertical"
              margin={{ left: 20, right: 40, top: 10, bottom: 10 }}
            >
              <CartesianGrid stroke="hsl(240, 4%, 16%)" horizontal={false} />
              <XAxis
                type="number"
                stroke={COLORS.muted}
                tick={{ fill: COLORS.muted, fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="faixa"
                stroke={COLORS.muted}
                tick={{ fill: COLORS.muted, fontSize: 12 }}
                width={80}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number) => [formatPct(value), 'Percentual']}
              />
              <Bar dataKey="pct" fill={COLORS.lilac} radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="pct"
                  position="right"
                  fill={COLORS.muted}
                  fontSize={11}
                  formatter={(v: number) => formatPct(v)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2.3 — Bar chart agrupado vertical: contagem por SDR/faixa */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Contagem por SDR (agrupada por Faixa)
        </h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={porSdrCount} margin={{ left: 10, right: 10, top: 20, bottom: 30 }}>
            <CartesianGrid stroke="hsl(240, 4%, 16%)" vertical={false} />
            <XAxis
              dataKey="sdr"
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 11 }}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 12 }}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [formatNumber(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: COLORS.muted }} />
            {FAIXAS_TEMPO.map((f, i) => (
              <Bar
                key={f}
                dataKey={f}
                fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2.4 — Bar chart agrupado vertical: % por SDR/faixa */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Percentual por SDR (agrupada por Faixa)
        </h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={porSdrPct} margin={{ left: 10, right: 10, top: 20, bottom: 30 }}>
            <CartesianGrid stroke="hsl(240, 4%, 16%)" vertical={false} />
            <XAxis
              dataKey="sdr"
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 11 }}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 12 }}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [formatPct(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: COLORS.muted }} />
            {FAIXAS_TEMPO.map((f, i) => (
              <Bar
                key={f}
                dataKey={f}
                fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2.5 — Nota por SDR */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Nota de Tempo de Resposta por SDR (0 a 1)
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={notaPorSdr} margin={{ left: 10, right: 10, top: 20, bottom: 30 }}>
            <CartesianGrid stroke="hsl(240, 4%, 16%)" vertical={false} />
            <XAxis
              dataKey="sdr"
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 11 }}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 12 }}
              domain={[0, 1]}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number) => [value.toFixed(2), 'Nota']}
            />
            <Bar dataKey="nota" fill={COLORS.gold} radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="nota"
                position="top"
                fill={COLORS.muted}
                fontSize={11}
                formatter={(v: number) => v.toFixed(2)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Bloco2TempoResposta;
