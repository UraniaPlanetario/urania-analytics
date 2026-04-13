import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { LeadQuality } from '../types';

interface Props {
  leads: LeadQuality[];
}

interface OffenderItem {
  label: string;
  pct: number;
  count: number;
  total: number;
}

export function DiagnosticBlock({ leads }: Props) {
  const offenders = useMemo(() => {
    const criteria: {
      label: string;
      field: keyof LeadQuality;
      badValue: string;
      excludeValue?: string;
    }[] = [
      { label: 'Abordagem Inicial (Ruim)', field: 'qualidade_abordagem_inicial', badValue: 'Ruim' },
      { label: 'Personalização Atendimento (Não)', field: 'personalizacao_atendimento', badValue: 'Não' },
      { label: 'Clareza Comunicação (Não)', field: 'clareza_comunicacao', badValue: 'Não' },
      { label: 'Conectou Solução (Não)', field: 'conectou_solucao_necessidade', badValue: 'Não' },
      { label: 'Explicou Benefícios (Não)', field: 'explicou_beneficios', badValue: 'Não' },
      { label: 'Personalizou Argumentação (Não)', field: 'personalizou_argumentacao', badValue: 'Não' },
      { label: 'Desconto Justificado (Não)', field: 'desconto_justificado', badValue: 'Não', excludeValue: 'Não se aplica' },
      { label: 'Quebrou Preço s/ Necessidade (Sim)', field: 'quebrou_preco_sem_necessidade', badValue: 'Sim', excludeValue: 'Não se aplica' },
      { label: 'Próximo Passo Definido (Não)', field: 'proximo_passo_definido', badValue: 'Não' },
    ];

    const results: OffenderItem[] = criteria.map(({ label, field, badValue, excludeValue }) => {
      let total = 0;
      let badCount = 0;
      for (const lead of leads) {
        const val = lead[field];
        if (val == null || val === '') continue;
        if (excludeValue && val === excludeValue) continue;
        total++;
        if (val === badValue) badCount++;
      }
      return {
        label,
        pct: total > 0 ? Math.round((badCount / total) * 100) : 0,
        count: badCount,
        total,
      };
    });

    return results.sort((a, b) => b.pct - a.pct);
  }, [leads]);

  const top3 = offenders.slice(0, 3);

  const barFill = (pct: number): string => {
    if (pct >= 50) return 'hsl(0, 72%, 51%)';
    if (pct >= 30) return 'hsl(45, 93%, 47%)';
    return 'hsl(263, 70%, 58%)';
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Diagnóstico (Ofensores)</h2>

      {/* Top 3 worst */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((item, idx) => (
          <div
            key={item.label}
            className="card-glass p-4 rounded-xl border-l-4"
            style={{ borderLeftColor: barFill(item.pct) }}
          >
            <p className="text-xs text-muted-foreground">#{idx + 1} Maior Ofensor</p>
            <p className="text-sm font-semibold text-foreground mt-1">{item.label}</p>
            <p className="text-2xl font-bold mt-2" style={{ color: barFill(item.pct) }}>
              {item.pct}%
            </p>
            <p className="text-xs text-muted-foreground">
              {item.count} de {item.total} leads
            </p>
          </div>
        ))}
      </div>

      {/* Bar chart - all offenders */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">
          % Respostas Negativas por Critério
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(250, offenders.length * 40)}>
          <BarChart data={offenders} layout="vertical" margin={{ left: 220 }}>
            <XAxis
              type="number"
              domain={[0, 100]}
              stroke="hsl(240, 5%, 65%)"
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="hsl(240, 5%, 65%)"
              tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }}
              width={215}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => [`${value}%`, 'Negativos']}
            />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
              {offenders.map((entry, idx) => (
                <Cell key={idx} fill={barFill(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Conformidade por Vendedor × Critério */}
      <div className="card-glass p-4 rounded-xl overflow-x-auto">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Conformidade por Vendedor × Critério (%)
        </h3>
        <ConformityTable leads={leads} />
      </div>
    </section>
  );
}

const CONFORMITY_CRITERIA: {
  label: string;
  field: keyof LeadQuality;
  goodValues: string[];
  excludeValue?: string;
}[] = [
  { label: 'Abordagem Inicial', field: 'qualidade_abordagem_inicial', goodValues: ['Boa'] },
  { label: 'Personalização', field: 'personalizacao_atendimento', goodValues: ['Sim'] },
  { label: 'Clareza', field: 'clareza_comunicacao', goodValues: ['Sim'] },
  { label: 'Conectou Solução', field: 'conectou_solucao_necessidade', goodValues: ['Sim'] },
  { label: 'Explicou Benefícios', field: 'explicou_beneficios', goodValues: ['Sim'] },
  { label: 'Personalizou Arg.', field: 'personalizou_argumentacao', goodValues: ['Sim'] },
  { label: 'Próximo Passo', field: 'proximo_passo_definido', goodValues: ['Sim'] },
  { label: 'Desconto Justificado', field: 'desconto_justificado', goodValues: ['Sim'], excludeValue: 'Não se aplica' },
  { label: 'Quebrou Preço', field: 'quebrou_preco_sem_necessidade', goodValues: ['Não'], excludeValue: 'Não se aplica' },
];

function cellColor(pct: number): string {
  if (pct >= 90) return 'hsl(142, 71%, 25%)';
  if (pct >= 75) return 'hsl(142, 50%, 35%)';
  if (pct >= 60) return 'hsl(45, 70%, 35%)';
  if (pct >= 40) return 'hsl(25, 70%, 35%)';
  return 'hsl(0, 60%, 35%)';
}

function ConformityTable({ leads }: { leads: LeadQuality[] }) {
  const data = useMemo(() => {
    const vendedorMap: Record<string, LeadQuality[]> = {};
    for (const lead of leads) {
      const v = lead.vendedor_consultor;
      if (!v) continue;
      if (!vendedorMap[v]) vendedorMap[v] = [];
      vendedorMap[v].push(lead);
    }

    return Object.entries(vendedorMap)
      .map(([vendedor, vLeads]) => {
        const row: Record<string, any> = { vendedor, count: vLeads.length };
        for (const crit of CONFORMITY_CRITERIA) {
          let total = 0;
          let good = 0;
          for (const lead of vLeads) {
            const val = lead[crit.field];
            if (val == null || val === '') continue;
            if (crit.excludeValue && val === crit.excludeValue) continue;
            total++;
            if (crit.goodValues.includes(val)) good++;
          }
          row[crit.field] = total > 0 ? Math.round((good / total) * 100) : null;
        }
        return row;
      })
      .sort((a, b) => (a.vendedor as string).localeCompare(b.vendedor as string));
  }, [leads]);

  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <th className="text-left py-2 px-2 text-muted-foreground font-medium sticky left-0 bg-card">Vendedor</th>
          {CONFORMITY_CRITERIA.map((c) => (
            <th key={c.field} className="text-center py-2 px-1 text-muted-foreground font-medium whitespace-nowrap">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.vendedor} className="border-t border-border/30">
            <td className="py-2 px-2 text-foreground font-medium sticky left-0 bg-card whitespace-nowrap">
              {row.vendedor}
            </td>
            {CONFORMITY_CRITERIA.map((c) => {
              const val = row[c.field];
              return (
                <td key={c.field} className="text-center py-2 px-1">
                  {val != null ? (
                    <span
                      className="inline-block px-2 py-1 rounded text-white font-medium min-w-[40px]"
                      style={{ backgroundColor: cellColor(val) }}
                    >
                      {val}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
