import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import type { LeadQuality } from '../types';
import { DIAS_FECHAR_ORDER, LIGACOES_ORDER } from '../types';

interface Props {
  leads: LeadQuality[];
}

const PURPLE = 'hsl(263, 70%, 58%)';
const LILAC = 'hsl(270, 50%, 70%)';
const GOLD = 'hsl(45, 80%, 55%)';
const GREEN = 'hsl(142, 60%, 50%)';
const RED = 'hsl(0, 72%, 51%)';

const DONUT_COLORS = [GREEN, RED, LILAC];

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

function countField(leads: LeadQuality[], field: keyof LeadQuality): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const lead of leads) {
    const val = lead[field];
    if (val != null && val !== '') {
      counts[val] = (counts[val] || 0) + 1;
    }
  }
  return counts;
}

function orderedData(counts: Record<string, number>, order: string[]): { name: string; value: number }[] {
  return order
    .filter((k) => counts[k] != null)
    .map((k) => ({ name: k, value: counts[k] }));
}

function volumeSorted(counts: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

export function CommercialBlock({ leads }: Props) {
  const diasFechar = useMemo(
    () => orderedData(countField(leads, 'dias_ate_fechar'), DIAS_FECHAR_ORDER),
    [leads]
  );

  const pediuData = useMemo(
    () => orderedData(countField(leads, 'pediu_data'), ['Sim', 'Não']),
    [leads]
  );

  const ligacoes = useMemo(
    () => orderedData(countField(leads, 'ligacoes_feitas'), LIGACOES_ORDER),
    [leads]
  );

  const produtos = useMemo(
    () => volumeSorted(countField(leads, 'produtos')),
    [leads]
  );

  const closingsPerMonth = useMemo(() => {
    const monthly: Record<string, number> = {};
    for (const lead of leads) {
      const dt = lead.data_fechamento;
      if (!dt) continue;
      // Extract YYYY-MM from date string
      const match = dt.match(/^(\d{4}-\d{2})/);
      if (match) {
        const key = match[1];
        monthly[key] = (monthly[key] || 0) + 1;
      } else {
        // Try dd/mm/yyyy format
        const brMatch = dt.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (brMatch) {
          const key = `${brMatch[3]}-${brMatch[2]}`;
          monthly[key] = (monthly[key] || 0) + 1;
        }
      }
    }
    return Object.entries(monthly)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ name: month, value: count }));
  }, [leads]);

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Comercial</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dias até fechar */}
        <div className="card-glass p-4 rounded-xl">
          <h3 className="text-base font-semibold text-foreground mb-4">Dias até Fechar</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={diasFechar} margin={{ bottom: 20 }}>
              <XAxis
                dataKey="name"
                stroke="hsl(240, 5%, 65%)"
                tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }}
              />
              <YAxis stroke="hsl(240, 5%, 65%)" />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="value" fill={PURPLE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ligacoes feitas */}
        <div className="card-glass p-4 rounded-xl">
          <h3 className="text-base font-semibold text-foreground mb-4">Ligações Feitas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ligacoes} margin={{ bottom: 20 }}>
              <XAxis
                dataKey="name"
                stroke="hsl(240, 5%, 65%)"
                tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }}
              />
              <YAxis stroke="hsl(240, 5%, 65%)" />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="value" fill={LILAC} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pediu data - donut */}
        <div className="card-glass p-4 rounded-xl flex flex-col items-center">
          <h3 className="text-base font-semibold text-foreground mb-4">Pediu Data</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pediuData}
                dataKey="value"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
                nameKey="name"
              >
                {pediuData.map((_, idx) => (
                  <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(240, 5%, 65%)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Produtos - horizontal bar */}
        <div className="card-glass p-4 rounded-xl lg:col-span-2">
          <h3 className="text-base font-semibold text-foreground mb-4">Produtos</h3>
          <ResponsiveContainer width="100%" height={Math.max(160, produtos.length * 36)}>
            <BarChart data={produtos} layout="vertical" margin={{ left: 140 }}>
              <XAxis type="number" stroke="hsl(240, 5%, 65%)" />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(240, 5%, 65%)"
                tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 12 }}
                width={135}
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="value" fill={PURPLE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline - closings per month */}
      {closingsPerMonth.length > 0 && (
        <div className="card-glass p-4 rounded-xl">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Fechamentos por Mês
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={closingsPerMonth} margin={{ bottom: 30 }}>
              <XAxis
                dataKey="name"
                stroke="hsl(240, 5%, 65%)"
                tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }}
                angle={-30}
                textAnchor="end"
              />
              <YAxis stroke="hsl(240, 5%, 65%)" />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={PURPLE}
                strokeWidth={2}
                dot={{ fill: LILAC, r: 4 }}
                activeDot={{ r: 6, fill: GOLD }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
