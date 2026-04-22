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
import { SDR, MetaSDR, formatNumber } from '../types';
import type { AlteracaoResumoRow, AlteracaoDiariaRow } from '../hooks/useDesempenhoSDR';
import {
  TOOLTIP_STYLE,
  COLORS,
  SERIES_COLORS,
  getActiveSdrs,
  toWeekKey,
  datesBetween,
  shortDay,
} from './_helpers';

interface Props {
  resumo: AlteracaoResumoRow[];
  diaria: AlteracaoDiariaRow[];
  sdrs: SDR[];
  metas: MetaSDR[];
  dateFrom: Date;
  dateTo: Date;
}

export function Bloco4Campos({ resumo, diaria, sdrs, metas, dateFrom, dateTo }: Props) {
  const sdrNames = useMemo(() => new Set(sdrs.map((s) => s.nome)), [sdrs]);

  // Filtra agregados aos SDRs do dim_sdrs
  const resumoSDR = useMemo(
    () => resumo.filter((r) => r.user_name && sdrNames.has(r.user_name)),
    [resumo, sdrNames],
  );
  const diariaSDR = useMemo(
    () => diaria.filter((d) => d.user_name && sdrNames.has(d.user_name)),
    [diaria, sdrNames],
  );

  // 4.1 — Média diária (total do time / dias com alteração)
  const mediaDiariaKpi = useMemo(() => {
    const total = resumoSDR.reduce((s, r) => s + r.total, 0);
    const diasSet = new Set<string>();
    for (const d of diariaSDR) diasSet.add(d.dia);
    const dias = diasSet.size;
    return { total, dias, media: dias > 0 ? total / dias : 0 };
  }, [resumoSDR, diariaSDR]);

  const metaGlobalDiaria = useMemo(() => {
    const ativos = getActiveSdrs(sdrs, dateFrom, dateTo);
    const metasPorNivel = new Map(metas.map((m) => [m.nivel, m]));
    return ativos.reduce((sum, sdr) => {
      const meta = metasPorNivel.get(sdr.nivel);
      return sum + (meta?.meta_campos_diarios || 0);
    }, 0);
  }, [sdrs, metas, dateFrom, dateTo]);

  // 4.2 — Total diário (soma de todos os SDRs por dia)
  const totalDiario = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of diariaSDR) {
      counts[d.dia] = (counts[d.dia] || 0) + d.total;
    }
    return datesBetween(dateFrom, dateTo).map((key) => ({
      date: key,
      label: shortDay(key),
      count: counts[key] || 0,
    }));
  }, [diariaSDR, dateFrom, dateTo]);

  // 4.3 — Média semanal por SDR (top 8 por volume total no período)
  const mediaSemanalPorSdr = useMemo(() => {
    const totalPorSdr: Record<string, number> = {};
    for (const r of resumoSDR) {
      if (!r.user_name) continue;
      totalPorSdr[r.user_name] = (totalPorSdr[r.user_name] || 0) + r.total;
    }
    const top8 = Object.entries(totalPorSdr)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([n]) => n);
    const top8Set = new Set(top8);

    const weekSdrMap: Record<string, Record<string, number>> = {};
    const weekDays: Record<string, Set<string>> = {};
    for (const d of diariaSDR) {
      if (!d.user_name || !top8Set.has(d.user_name)) continue;
      const [y, m, day] = d.dia.split('-').map(Number);
      const date = new Date(y, m - 1, day);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue;
      const week = toWeekKey(date);
      if (!weekSdrMap[week]) weekSdrMap[week] = {};
      weekSdrMap[week][d.user_name] = (weekSdrMap[week][d.user_name] || 0) + d.total;
      if (!weekDays[week]) weekDays[week] = new Set();
      weekDays[week].add(d.dia);
    }

    const weeks = Object.keys(weekSdrMap).sort();
    const rows = weeks.map((week) => {
      const row: Record<string, any> = { week };
      const dias = weekDays[week]?.size || 1;
      for (const sdr of top8) {
        row[sdr] = (weekSdrMap[week][sdr] || 0) / dias;
      }
      return row;
    });
    return { rows, sdrs: top8 };
  }, [resumoSDR, diariaSDR]);

  // 4.4 — Média diária por SDR
  const mediaDiariaPorSdr = useMemo(() => {
    return resumoSDR
      .filter((r) => r.user_name)
      .map((r) => ({
        sdr: r.user_name!,
        media: r.dias_com_alt > 0 ? r.total / r.dias_com_alt : 0,
      }))
      .sort((a, b) => b.media - a.media);
  }, [resumoSDR]);

  // 4.5 — Média por lead por SDR
  const mediaPorLeadPorSdr = useMemo(() => {
    return resumoSDR
      .filter((r) => r.user_name)
      .map((r) => ({
        sdr: r.user_name!,
        media: r.leads_distintos > 0 ? r.total / r.leads_distintos : 0,
      }))
      .sort((a, b) => b.media - a.media);
  }, [resumoSDR]);

  // 4.6 — Total por SDR
  const totalPorSdr = useMemo(() => {
    return resumoSDR
      .filter((r) => r.user_name)
      .map((r) => ({ sdr: r.user_name!, total: r.total }))
      .sort((a, b) => b.total - a.total);
  }, [resumoSDR]);

  if (resumoSDR.length === 0) {
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
