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
import type { LeadQuality } from '@/types/leads';
import { SCORE_MAP } from '@/types/leads';

interface Props {
  leads: LeadQuality[];
}

interface SellerStats {
  vendedor: string;
  qtdLeads: number;
  scoreMedio: number;
  pctAbordagemBoa: number;
  pctClarezaSim: number;
  pctDescontoJustificado: number;
}

function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

export function SellerBlock({ leads }: Props) {
  const sellerData = useMemo(() => {
    const grouped: Record<string, LeadQuality[]> = {};
    for (const lead of leads) {
      const seller = lead.vendedor_consultor || 'Sem vendedor';
      if (!grouped[seller]) grouped[seller] = [];
      grouped[seller].push(lead);
    }

    const stats: SellerStats[] = Object.entries(grouped).map(
      ([vendedor, sellerLeads]) => {
        let scoreSum = 0;
        let scoreCount = 0;
        let abordagemBoa = 0;
        let clarezaSim = 0;
        let clarezaTotal = 0;
        let descontoJust = 0;
        let descontoTotal = 0;

        for (const lead of sellerLeads) {
          const s = lead.score_qualidade;
          if (s && SCORE_MAP[s] != null) {
            scoreSum += SCORE_MAP[s];
            scoreCount++;
          }
          if (lead.qualidade_abordagem_inicial === 'Boa') abordagemBoa++;
          if (lead.clareza_comunicacao != null && lead.clareza_comunicacao !== '') {
            clarezaTotal++;
            if (lead.clareza_comunicacao === 'Sim') clarezaSim++;
          }
          if (
            lead.desconto_justificado != null &&
            lead.desconto_justificado !== '' &&
            lead.desconto_justificado !== 'Não se aplica'
          ) {
            descontoTotal++;
            if (lead.desconto_justificado === 'Sim') descontoJust++;
          }
        }

        return {
          vendedor,
          qtdLeads: sellerLeads.length,
          scoreMedio: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
          pctAbordagemBoa: pct(abordagemBoa, sellerLeads.length),
          pctClarezaSim: pct(clarezaSim, clarezaTotal),
          pctDescontoJustificado: pct(descontoJust, descontoTotal),
        };
      }
    );

    return stats.sort((a, b) => b.scoreMedio - a.scoreMedio);
  }, [leads]);

  const barColor = (score: number): string => {
    if (score >= 90) return 'hsl(142, 71%, 30%)';
    if (score >= 75) return 'hsl(142, 60%, 50%)';
    if (score >= 60) return 'hsl(45, 93%, 47%)';
    return 'hsl(0, 72%, 51%)';
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Performance por Vendedor</h2>

      {/* Table */}
      <div className="card-glass p-4 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Vendedor</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Qtd Leads</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Score Médio</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">% Abordagem Boa</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">% Clareza Sim</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">% Desc. Justificado</th>
            </tr>
          </thead>
          <tbody>
            {sellerData.map((s) => (
              <tr key={s.vendedor} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="py-2 px-3 text-foreground">{s.vendedor}</td>
                <td className="py-2 px-3 text-center text-foreground">{s.qtdLeads}</td>
                <td className="py-2 px-3 text-center font-semibold" style={{ color: barColor(s.scoreMedio) }}>
                  {s.scoreMedio}
                </td>
                <td className="py-2 px-3 text-center text-foreground">{s.pctAbordagemBoa}%</td>
                <td className="py-2 px-3 text-center text-foreground">{s.pctClarezaSim}%</td>
                <td className="py-2 px-3 text-center text-foreground">{s.pctDescontoJustificado}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bar Chart - Score médio por vendedor */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">Score Médio por Vendedor</h3>
        <ResponsiveContainer width="100%" height={Math.max(200, sellerData.length * 40)}>
          <BarChart data={sellerData} layout="vertical" margin={{ left: 120 }}>
            <XAxis type="number" domain={[0, 100]} stroke="hsl(240, 5%, 65%)" />
            <YAxis
              type="category"
              dataKey="vendedor"
              stroke="hsl(240, 5%, 65%)"
              tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 12 }}
              width={115}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => [`${value}`, 'Score']}
            />
            <Bar dataKey="scoreMedio" radius={[0, 4, 4, 0]}>
              {sellerData.map((entry, idx) => (
                <Cell key={idx} fill={barColor(entry.scoreMedio)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
