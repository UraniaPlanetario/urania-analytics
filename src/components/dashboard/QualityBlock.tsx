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
} from 'recharts';
import type { LeadQuality } from '@/types/leads';
import {
  SCORE_MAP,
  SCORE_LABELS,
  SCORE_COLORS,
  SCORE_OPTIONS,
} from '@/types/leads';

interface Props {
  leads: LeadQuality[];
}

const DONUT_COLORS_3 = [
  'hsl(142, 60%, 50%)',
  'hsl(45, 93%, 47%)',
  'hsl(0, 72%, 51%)',
];

const DONUT_COLORS_2 = [
  'hsl(142, 60%, 50%)',
  'hsl(0, 72%, 51%)',
];

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

function DonutChart({
  title,
  data,
  colors,
}: {
  title: string;
  data: { name: string; value: number }[];
  colors: string[];
}) {
  return (
    <div className="card-glass p-4 rounded-xl flex flex-col items-center">
      <h4 className="text-sm font-medium text-muted-foreground mb-2 text-center">
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={3}
            nameKey="name"
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={colors[idx % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'hsl(240, 5%, 65%)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildDonutData(counts: Record<string, number>, order?: string[]): { name: string; value: number }[] {
  if (order) {
    return order
      .filter((k) => counts[k] != null)
      .map((k) => ({ name: k, value: counts[k] }));
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

function pickColors(data: { name: string }[]): string[] {
  if (data.length <= 2) return DONUT_COLORS_2;
  return DONUT_COLORS_3;
}

export function QualityBlock({ leads }: Props) {
  const stats = useMemo(() => {
    let scoreSum = 0;
    let scoreCount = 0;
    const vendedoresSet = new Set<string>();

    for (const lead of leads) {
      const s = lead.score_qualidade;
      if (s && SCORE_MAP[s] != null) {
        scoreSum += SCORE_MAP[s];
        scoreCount++;
      }
      if (lead.vendedor_consultor) vendedoresSet.add(lead.vendedor_consultor);
    }

    return {
      scoreMedio: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
      totalAvaliados: scoreCount,
      vendedoresAvaliados: vendedoresSet.size,
    };
  }, [leads]);

  const scoreDistribution = useMemo(() => {
    const counts = countField(leads, 'score_qualidade');
    return SCORE_OPTIONS.map((key) => ({
      name: SCORE_LABELS[key] || key,
      value: counts[key] || 0,
      fill: SCORE_COLORS[key] || 'hsl(263, 70%, 58%)',
    }));
  }, [leads]);

  const qualityCriteria: { title: string; field: keyof LeadQuality; order?: string[] }[] = [
    { title: 'Abordagem Inicial', field: 'qualidade_abordagem_inicial', order: ['Boa', 'Média', 'Ruim'] },
    { title: 'Personalização Atendimento', field: 'personalizacao_atendimento', order: ['Sim', 'Parcial', 'Não'] },
    { title: 'Clareza Comunicação', field: 'clareza_comunicacao', order: ['Sim', 'Não'] },
    { title: 'Conectou Solução', field: 'conectou_solucao_necessidade', order: ['Sim', 'Parcial', 'Não'] },
    { title: 'Explicou Benefícios', field: 'explicou_beneficios', order: ['Sim', 'Parcial', 'Não'] },
    { title: 'Personalizou Argumentação', field: 'personalizou_argumentacao', order: ['Sim', 'Parcial', 'Não'] },
    { title: 'Próximo Passo Definido', field: 'proximo_passo_definido', order: ['Sim', 'Não'] },
  ];

  const discountCriteria: { title: string; field: keyof LeadQuality; order?: string[] }[] = [
    { title: 'Houve Desconto', field: 'houve_desconto', order: ['Sim', 'Não'] },
    { title: 'Desconto Justificado', field: 'desconto_justificado', order: ['Sim', 'Não', 'Não se aplica'] },
    { title: 'Quebrou Preço s/ Necessidade', field: 'quebrou_preco_sem_necessidade', order: ['Sim', 'Não', 'Não se aplica'] },
  ];

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Avaliação de Qualidade</h2>

      {/* KPIs + Score Distribution side by side */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
        {/* KPI Cards - stacked vertically */}
        <div className="flex flex-col gap-4">
          <div className="card-glass p-4 rounded-xl text-center">
            <p className="text-sm text-muted-foreground">Score Médio</p>
            <p className="text-3xl font-bold text-foreground">{stats.scoreMedio}</p>
          </div>
          <div className="card-glass p-4 rounded-xl text-center">
            <p className="text-sm text-muted-foreground">Leads Avaliados</p>
            <p className="text-3xl font-bold text-foreground">{stats.totalAvaliados}</p>
          </div>
          <div className="card-glass p-4 rounded-xl text-center">
            <p className="text-sm text-muted-foreground">Vendedores Avaliados</p>
            <p className="text-3xl font-bold text-foreground">{stats.vendedoresAvaliados}</p>
          </div>
        </div>

        {/* Score Distribution - Horizontal Bar */}
        <div className="card-glass p-4 rounded-xl">
          <h3 className="text-base font-semibold text-foreground mb-4">Distribuição de Score</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreDistribution} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" stroke="hsl(240, 5%, 65%)" />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(240, 5%, 65%)"
                tick={{ fill: 'hsl(240, 5%, 65%)' }}
                width={75}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {scoreDistribution.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quality Criteria Donuts */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">Critérios de Qualidade</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {qualityCriteria.map(({ title, field, order }) => {
            const counts = countField(leads, field);
            const data = buildDonutData(counts, order);
            const colors = pickColors(data);
            return <DonutChart key={field} title={title} data={data} colors={colors} />;
          })}
        </div>
      </div>

      {/* Discount Donuts */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">Descontos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {discountCriteria.map(({ title, field, order }) => {
            const counts = countField(leads, field);
            const data = buildDonutData(counts, order);
            const colors = pickColors(data);
            return <DonutChart key={field} title={title} data={data} colors={colors} />;
          })}
        </div>
      </div>
    </section>
  );
}
