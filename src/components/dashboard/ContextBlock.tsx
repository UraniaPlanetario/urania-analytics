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
import { DAY_ORDER, TEMPO_RESPOSTA_ORDER } from '@/types/leads';

interface Props {
  leads: LeadQuality[];
}

const PURPLE = 'hsl(263, 70%, 58%)';
const LILAC = 'hsl(270, 50%, 70%)';
const GOLD = 'hsl(45, 80%, 55%)';

const DONUT_COLORS = [PURPLE, LILAC, GOLD, 'hsl(142, 60%, 50%)', 'hsl(0, 72%, 51%)'];

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

function HorizontalBarSection({
  title,
  data,
  color = PURPLE,
}: {
  title: string;
  data: { name: string; value: number }[];
  color?: string;
}) {
  return (
    <div className="card-glass p-4 rounded-xl flex flex-col">
      <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
      <div className="flex-1 flex flex-col justify-center">
        {data.map((item) => {
          const maxVal = Math.max(...data.map((d) => d.value), 1);
          const pct = (item.value / maxVal) * 100;
          return (
            <div key={item.name} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground w-[140px] text-right shrink-0 truncate" title={item.name}>
                {item.name}
              </span>
              <div className="flex-1 h-6 bg-secondary/50 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs text-foreground w-8 text-right">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerticalBarSection({
  title,
  data,
  color = LILAC,
}: {
  title: string;
  data: { name: string; value: number }[];
  color?: string;
}) {
  return (
    <div className="card-glass p-4 rounded-xl">
      <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ bottom: 40 }}>
          <XAxis
            dataKey="name"
            stroke="hsl(240, 5%, 65%)"
            tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }}
            angle={-30}
            textAnchor="end"
          />
          <YAxis stroke="hsl(240, 5%, 65%)" />
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Color mapping: Sim=green (positive), Não=red (negative) for binary fields
const SIM_NAO_COLORS: Record<string, string> = {
  'Sim': 'hsl(142, 60%, 50%)',
  'Não': 'hsl(0, 72%, 51%)',
};

function DonutSection({
  title,
  data,
  colorMap,
}: {
  title: string;
  data: { name: string; value: number }[];
  colorMap?: Record<string, string>;
}) {
  return (
    <div className="card-glass p-4 rounded-xl flex flex-col items-center">
      <h3 className="text-base font-semibold text-foreground mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={3}
            nameKey="name"
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={colorMap?.[entry.name] ?? DONUT_COLORS[idx % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'hsl(240, 5%, 65%)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const FAIXA_HORARIO_ORDER = [
  '06:00-07:00',
  '07:00-08:00',
  '08:00-09:00',
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
  '18:00-19:00',
  '19:00-20:00',
  '20:00-21:00',
  '21:00-22:00',
  '22:00-23:00',
  '23:00-24:00',
  'Pós 24:00',
];

export function ContextBlock({ leads }: Props) {
  const quemAtendeu = useMemo(
    () => volumeSorted(countField(leads, 'quem_atendeu_primeiro')),
    [leads]
  );

  const tempoResposta = useMemo(
    () => orderedData(countField(leads, 'tempo_primeira_resposta'), TEMPO_RESPOSTA_ORDER),
    [leads]
  );

  const diaSemana = useMemo(
    () => orderedData(countField(leads, 'dia_semana_criacao'), DAY_ORDER),
    [leads]
  );

  const faixaHorario = useMemo(() => {
    const counts = countField(leads, 'faixa_horario_criacao');
    // Use ordered list, but also include any values not in the predefined order
    const known = orderedData(counts, FAIXA_HORARIO_ORDER);
    const knownNames = new Set(FAIXA_HORARIO_ORDER);
    const extra = Object.entries(counts)
      .filter(([k]) => !knownNames.has(k))
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));
    return [...known, ...extra];
  }, [leads]);

  const tipoDia = useMemo(
    () =>
      orderedData(countField(leads, 'tipo_de_dia'), ['Semana', 'Final de Semana', 'Feriado']),
    [leads]
  );

  const tipoCliente = useMemo(
    () => volumeSorted(countField(leads, 'tipo_cliente')),
    [leads]
  );

  const retornoFunil = useMemo(
    () => orderedData(countField(leads, 'retorno_etapa_funil'), ['Sim', 'Não']),
    [leads]
  );

  const retornoResgate = useMemo(
    () => orderedData(countField(leads, 'retorno_resgate'), ['Sim', 'Não']),
    [leads]
  );

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Contexto</h2>

      {/* Row 1: Quem atendeu + Tempo resposta + Tipo cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HorizontalBarSection title="Quem Atendeu Primeiro" data={quemAtendeu} color={PURPLE} />
        <VerticalBarSection title="Tempo Primeira Resposta" data={tempoResposta} color={LILAC} />
        <HorizontalBarSection title="Tipo de Cliente" data={tipoCliente} color={LILAC} />
      </div>

      {/* Row 2: Dia da semana + Faixa horário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VerticalBarSection title="Dia da Semana (Criação)" data={diaSemana} color={PURPLE} />
        <VerticalBarSection title="Faixa Horário (Criação)" data={faixaHorario} color={LILAC} />
      </div>

      {/* Row 3: Donuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DonutSection title="Tipo de Dia" data={tipoDia} />
        <DonutSection title="Retorno Etapa Funil" data={retornoFunil} colorMap={SIM_NAO_COLORS} />
        <DonutSection title="Retorno Resgate" data={retornoResgate} colorMap={SIM_NAO_COLORS} />
      </div>
    </section>
  );
}
