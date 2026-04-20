import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { AlteracaoSDR, SDR, MetaSDR, formatNumber } from '../types';
import {
  TOOLTIP_STYLE,
  COLORS,
  SERIES_COLORS,
  filterToSDRs,
  getActiveSdrs,
  toLocalDateKey,
  toWeekKey,
  datesBetween,
  shortDay,
} from './_helpers';

interface Props {
  alteracoes: AlteracaoSDR[];
  sdrs: SDR[];
  metas: MetaSDR[];
  dateFrom: Date;
  dateTo: Date;
}

export function Bloco4Campos({ alteracoes, sdrs, metas, dateFrom, dateTo }: Props) {
  const sdrNames = useMemo(() => new Set(sdrs.map((s) => s.nome)), [sdrs]);

  const filtered = useMemo(
    () => filterToSDRs(alteracoes, sdrNames, (a) => a.criado_por),
    [alteracoes, sdrNames],
  );

  // 4.1 — Média diária (total / dias úteis com alteração)
  const mediaDiariaKpi = useMemo(() => {
    const diasComAlt = new Set<string>();
    for (const a of filtered) {
      const d = new Date(a.data_criacao);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      diasComAlt.add(toLocalDateKey(d));
    }
    const total = filtered.length;
    const n = diasComAlt.size;
    return { total, dias: n, media: n > 0 ? total / n : 0 };
  }, [filtered]);

  // Meta global diária = soma das meta_campos_diarios dos SDRs ativos no período
  const metaGlobalDiaria = useMemo(() => {
    const ativos = getActiveSdrs(sdrs, dateFrom, dateTo);
    const metasPorNivel = new Map(metas.map((m) => [m.nivel, m]));
    return ativos.reduce((sum, sdr) => {
      const meta = metasPorNivel.get(sdr.nivel);
      return sum + (meta?.meta_campos_diarios || 0);
    }, 0);
  }, [sdrs, metas, dateFrom, dateTo]);

  // 4.2 — Total diário
  const totalDiario = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of filtered) {
      const key = toLocalDateKey(new Date(a.data_criacao));
      counts[key] = (counts[key] || 0) + 1;
    }
    return datesBetween(dateFrom, dateTo).map((key) => ({
      date: key,
      label: shortDay(key),
      count: counts[key] || 0,
    }));
  }, [filtered, dateFrom, dateTo]);

  // 4.3 — Média semanal por SDR (top 8)
  const mediaSemanalPorSdr = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    const weekdaysPerWeek: Record<string, Set<string>> = {};
    for (const a of filtered) {
      const d = new Date(a.data_criacao);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      const week = toWeekKey(d);
      const name = a.criado_por!;
      if (!map[week]) map[week] = {};
      map[week][name] = (map[week][name] || 0) + 1;
      if (!weekdaysPerWeek[week]) weekdaysPerWeek[week] = new Set();
      weekdaysPerWeek[week].add(toLocalDateKey(d));
    }
    const totalPorSdr: Record<string, number> = {};
    for (const a of filtered) {
      const name = a.criado_por!;
      totalPorSdr[name] = (totalPorSdr[name] || 0) + 1;
    }
    const top8 = Object.entries(totalPorSdr)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([n]) => n);

    const weeks = Object.keys(map).sort();
    const rows = weeks.map((week) => {
      const row: Record<string, any> = { week };
      const dias = weekdaysPerWeek[week]?.size || 1;
      for (const sdr of top8) {
        row[sdr] = (map[week][sdr] || 0) / dias;
      }
      return row;
    });
    return { rows, sdrs: top8 };
  }, [filtered]);

  // 4.4 — Média diária por SDR
  const mediaDiariaPorSdr = useMemo(() => {
    const totalPorSdr: Record<string, number> = {};
    const diasPorSdr: Record<string, Set<string>> = {};
    for (const a of filtered) {
      const d = new Date(a.data_criacao);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      const name = a.criado_por!;
      totalPorSdr[name] = (totalPorSdr[name] || 0) + 1;
      if (!diasPorSdr[name]) diasPorSdr[name] = new Set();
      diasPorSdr[name].add(toLocalDateKey(d));
    }
    return Object.keys(totalPorSdr)
      .map((sdr) => ({
        sdr,
        media: diasPorSdr[sdr].size > 0 ? totalPorSdr[sdr] / diasPorSdr[sdr].size : 0,
      }))
      .sort((a, b) => b.media - a.media);
  }, [filtered]);

  // 4.5 — Média por lead por SDR (lead_id distinct)
  const mediaPorLeadPorSdr = useMemo(() => {
    const sdrData: Record<string, { total: number; leads: Set<number> }> = {};
    for (const a of filtered) {
      const name = a.criado_por!;
      if (!sdrData[name]) sdrData[name] = { total: 0, leads: new Set() };
      sdrData[name].total += 1;
      if (a.lead_id != null) sdrData[name].leads.add(a.lead_id);
    }
    return Object.entries(sdrData)
      .map(([sdr, d]) => ({
        sdr,
        media: d.leads.size > 0 ? d.total / d.leads.size : 0,
      }))
      .sort((a, b) => b.media - a.media);
  }, [filtered]);

  // 4.6 — Total por SDR
  const totalPorSdr = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of filtered) {
      const name = a.criado_por!;
      map[name] = (map[name] || 0) + 1;
    }
    return Object.entries(map)
      .map(([sdr, total]) => ({ sdr, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  if (filtered.length === 0) {
    return (
      <div className="card-glass p-8 rounded-xl text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma alteração de campo de SDR no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4.1 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Média Diária</p>
          <p className="text-4xl font-bold text-foreground">
            {mediaDiariaKpi.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatNumber(mediaDiariaKpi.total)} alt. / {mediaDiariaKpi.dias} dias úteis
          </p>
        </div>
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Meta Diária do Time</p>
          <p className="text-4xl font-bold text-foreground">{formatNumber(metaGlobalDiaria)}</p>
          <p className="text-xs text-muted-foreground mt-1">Soma das metas dos SDRs ativos</p>
        </div>
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Total de Alterações</p>
          <p className="text-4xl font-bold text-foreground">{formatNumber(mediaDiariaKpi.total)}</p>
          <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
        </div>
      </div>

      {/* 4.2 Line chart total diário */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">Total Diário de Alterações</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={totalDiario} margin={{ left: 10, right: 20, top: 20, bottom: 10 }}>
            <CartesianGrid stroke="hsl(240, 4%, 16%)" />
            <XAxis
              dataKey="label"
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 11 }}
            />
            <YAxis stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number) => [formatNumber(value), 'Alterações']}
            />
            {metaGlobalDiaria > 0 && (
              <ReferenceLine
                y={metaGlobalDiaria}
                stroke={COLORS.gold}
                strokeDasharray="6 4"
                label={{
                  value: `Meta: ${formatNumber(metaGlobalDiaria)}`,
                  position: 'right',
                  fill: COLORS.gold,
                  fontSize: 11,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="count"
              stroke={COLORS.green}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS.green }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 4.3 Bar chart agrupado vertical */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Média Semanal por SDR (Top 8)
        </h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={mediaSemanalPorSdr.rows} margin={{ left: 10, right: 10, top: 20, bottom: 30 }}>
            <CartesianGrid stroke="hsl(240, 4%, 16%)" vertical={false} />
            <XAxis
              dataKey="week"
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 11 }}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number, name: string) => [
                value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
                name,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: COLORS.muted }} />
            {mediaSemanalPorSdr.sdrs.map((sdr, i) => (
              <Bar
                key={sdr}
                dataKey={sdr}
                fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 4.4 */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">Média Diária por SDR</h3>
        <ResponsiveContainer width="100%" height={Math.max(240, mediaDiariaPorSdr.length * 36)}>
          <BarChart
            data={mediaDiariaPorSdr}
            layout="vertical"
            margin={{ left: 20, right: 60, top: 10, bottom: 10 }}
          >
            <CartesianGrid stroke="hsl(240, 4%, 16%)" horizontal={false} />
            <XAxis type="number" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="sdr"
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 12 }}
              width={120}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number) => [
                value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
                'Média',
              ]}
            />
            <Bar dataKey="media" fill={COLORS.purple} radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="media"
                position="right"
                fill={COLORS.muted}
                fontSize={11}
                formatter={(v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 4.5 */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Alterações por Lead por SDR
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(240, mediaPorLeadPorSdr.length * 36)}>
          <BarChart
            data={mediaPorLeadPorSdr}
            layout="vertical"
            margin={{ left: 20, right: 60, top: 10, bottom: 10 }}
          >
            <CartesianGrid stroke="hsl(240, 4%, 16%)" horizontal={false} />
            <XAxis type="number" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="sdr"
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 12 }}
              width={120}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number) => [
                value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
                'Média',
              ]}
            />
            <Bar dataKey="media" fill={COLORS.lilac} radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="media"
                position="right"
                fill={COLORS.muted}
                fontSize={11}
                formatter={(v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 4.6 */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">Total de Alterações por SDR</h3>
        <ResponsiveContainer width="100%" height={Math.max(240, totalPorSdr.length * 36)}>
          <BarChart
            data={totalPorSdr}
            layout="vertical"
            margin={{ left: 20, right: 60, top: 10, bottom: 10 }}
          >
            <CartesianGrid stroke="hsl(240, 4%, 16%)" horizontal={false} />
            <XAxis type="number" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="sdr"
              stroke={COLORS.muted}
              tick={{ fill: COLORS.muted, fontSize: 12 }}
              width={120}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: number) => [formatNumber(value), 'Total']}
            />
            <Bar dataKey="total" fill={COLORS.gold} radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="total"
                position="right"
                fill={COLORS.muted}
                fontSize={11}
                formatter={(v: number) => formatNumber(v)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Bloco4Campos;
