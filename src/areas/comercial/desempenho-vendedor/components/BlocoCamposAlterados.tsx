import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { normalizeUserName, formatNumber } from '../types';
import type { AlteracaoResumoRow, AlteracaoMensalRow } from '../../desempenho-sdr/hooks/useDesempenhoSDR';

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const COLORS = [
  'hsl(263, 70%, 58%)',
  'hsl(270, 50%, 70%)',
  'hsl(45, 80%, 55%)',
  'hsl(142, 60%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(200, 70%, 55%)',
  'hsl(330, 65%, 60%)',
  'hsl(30, 80%, 55%)',
];

interface VendedorStat {
  vendedor: string;
  total: number;
  diasComAlteracao: number;
  leadsDistintos: number;
}

interface Props {
  resumo: AlteracaoResumoRow[];
  mensal: AlteracaoMensalRow[];
}

export function BlocoCamposAlterados({ resumo, mensal }: Props) {
  const vendedorStats = useMemo<VendedorStat[]>(() => {
    // Agrega por nome normalizado (pode mergear "Perla" e "Perla Nogueira")
    const map: Record<string, { total: number; dias: number; leads: number }> = {};
    for (const r of resumo) {
      const v = normalizeUserName(r.user_name);
      if (!map[v]) {
        map[v] = { total: 0, dias: 0, leads: 0 };
      }
      map[v].total += r.total;
      map[v].dias += r.dias_com_alt;
      map[v].leads += r.leads_distintos;
    }
    return Object.entries(map)
      .map(([vendedor, v]) => ({
        vendedor,
        total: v.total,
        diasComAlteracao: v.dias,
        leadsDistintos: v.leads,
      }))
      .sort((a, b) => b.total - a.total);
  }, [resumo]);

  const totalAlteracoes = vendedorStats.reduce((s, v) => s + v.total, 0);
  const numVendedores = vendedorStats.length;
  const totalDias = vendedorStats.reduce((s, v) => s + v.diasComAlteracao, 0);
  const totalLeads = vendedorStats.reduce((s, v) => s + v.leadsDistintos, 0);

  const mediaPorVendedor = numVendedores > 0 ? totalAlteracoes / numVendedores : 0;
  const mediaDiaria = totalDias > 0 ? totalAlteracoes / totalDias : 0;
  const mediaPorLead = totalLeads > 0 ? totalAlteracoes / totalLeads : 0;

  const topVendedores = useMemo(() => vendedorStats.slice(0, 8).map((v) => v.vendedor), [vendedorStats]);

  const monthlyData = useMemo(() => {
    // mensal vem do RPC: {user_id, user_name, mes_key: 'YYYY-MM', total}
    // Agrupa por mes_key e normaliza nome, só top 8 vendedores
    const topSet = new Set(topVendedores);
    const map: Record<string, Record<string, number>> = {};
    for (const m of mensal) {
      const v = normalizeUserName(m.user_name);
      if (!topSet.has(v)) continue;
      if (!map[m.mes_key]) map[m.mes_key] = {};
      map[m.mes_key][v] = (map[m.mes_key][v] || 0) + m.total;
    }
    const monthKeys = Object.keys(map).sort();
    return monthKeys.map((key) => {
      const [year, month] = key.split('-');
      const row: Record<string, number | string> = {
        name: `${MONTH_LABELS[Number(month) - 1]}/${year.slice(2)}`,
      };
      for (const v of topVendedores) {
        row[v] = map[key][v] || 0;
      }
      return row;
    });
  }, [mensal, topVendedores]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Média por Vendedor</p>
          <p className="text-3xl font-bold text-foreground">{mediaPorVendedor.toFixed(1).replace('.', ',')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatNumber(totalAlteracoes)} alt. / {numVendedores} vendedores
          </p>
        </div>
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Média Diária</p>
          <p className="text-3xl font-bold text-foreground">{mediaDiaria.toFixed(1).replace('.', ',')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatNumber(totalAlteracoes)} alt. / {totalDias} dias úteis
          </p>
        </div>
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Média por Lead</p>
          <p className="text-3xl font-bold text-foreground">{mediaPorLead.toFixed(1).replace('.', ',')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatNumber(totalAlteracoes)} alt. / {totalLeads} leads
          </p>
        </div>
      </div>

      <div className="card-glass p-4 rounded-xl overflow-x-auto">
        <h3 className="text-base font-semibold text-foreground mb-4">Total por Vendedor</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-medium">
              <th className="text-left py-2 px-3">Vendedor</th>
              <th className="text-right py-2 px-3">Total de Alterações</th>
              <th className="text-right py-2 px-3">% do Total</th>
            </tr>
          </thead>
          <tbody>
            {vendedorStats.map((v) => {
              const pct = totalAlteracoes > 0 ? (v.total / totalAlteracoes) * 100 : 0;
              return (
                <tr key={v.vendedor} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2 px-3 text-foreground font-medium">{v.vendedor}</td>
                  <td className="py-2 px-3 text-right text-foreground">{formatNumber(v.total)}</td>
                  <td className="py-2 px-3 text-right text-foreground">{pct.toFixed(1).replace('.', ',')}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card-glass p-4 rounded-xl overflow-x-auto">
        <h3 className="text-base font-semibold text-foreground mb-4">Média Diária por Vendedor</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-medium">
              <th className="text-left py-2 px-3">Vendedor</th>
              <th className="text-right py-2 px-3">Total</th>
              <th className="text-right py-2 px-3">Dias com Alteração</th>
              <th className="text-right py-2 px-3">Média Diária</th>
            </tr>
          </thead>
          <tbody>
            {vendedorStats.map((v) => {
              const media = v.diasComAlteracao > 0 ? v.total / v.diasComAlteracao : 0;
              return (
                <tr key={v.vendedor} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2 px-3 text-foreground font-medium">{v.vendedor}</td>
                  <td className="py-2 px-3 text-right text-foreground">{formatNumber(v.total)}</td>
                  <td className="py-2 px-3 text-right text-foreground">{formatNumber(v.diasComAlteracao)}</td>
                  <td className="py-2 px-3 text-right text-foreground">{media.toFixed(1).replace('.', ',')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card-glass p-4 rounded-xl overflow-x-auto">
        <h3 className="text-base font-semibold text-foreground mb-4">Média de Alterações por Lead</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-medium">
              <th className="text-left py-2 px-3">Vendedor</th>
              <th className="text-right py-2 px-3">Total</th>
              <th className="text-right py-2 px-3">Leads Alterados</th>
              <th className="text-right py-2 px-3">Média por Lead</th>
            </tr>
          </thead>
          <tbody>
            {vendedorStats.map((v) => {
              const media = v.leadsDistintos > 0 ? v.total / v.leadsDistintos : 0;
              return (
                <tr key={v.vendedor} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2 px-3 text-foreground font-medium">{v.vendedor}</td>
                  <td className="py-2 px-3 text-right text-foreground">{formatNumber(v.total)}</td>
                  <td className="py-2 px-3 text-right text-foreground">{formatNumber(v.leadsDistintos)}</td>
                  <td className="py-2 px-3 text-right text-foreground">{media.toFixed(1).replace('.', ',')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card-glass p-4 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Alterações Mensais por Vendedor</h3>
          <p className="text-xs text-muted-foreground">Top 8 vendedores por volume</p>
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={monthlyData} margin={{ left: 10, right: 10, top: 20 }}>
            <XAxis dataKey="name" stroke="hsl(240, 5%, 65%)" tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 12 }} />
            <YAxis stroke="hsl(240, 5%, 65%)" tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 12 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(240, 5%, 65%)' }} />
            {topVendedores.map((v, i) => (
              <Bar key={v} dataKey={v} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default BlocoCamposAlterados;
