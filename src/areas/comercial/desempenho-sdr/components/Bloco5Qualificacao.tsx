import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
  CartesianGrid,
} from 'recharts';
import { MovimentoLead, SDR, formatNumber, formatPct, isQualificadoSDRById } from '../types';
import { useLeadsSDRMap, useLeadsFechados } from '../hooks/useDesempenhoSDR';
import { TOOLTIP_STYLE, COLORS } from './_helpers';

interface Props {
  movimentos: MovimentoLead[];
  leads: any[];
  sdrs: SDR[];
}

const RECEPCAO = 'Recepção Leads Insta';
const VENDAS_WPP = 'Vendas WhatsApp';

type Canal = 'insta' | 'whatsapp' | 'geral';
const CANAIS: { id: Canal; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'insta', label: 'Instagram' },
];

interface CanalStats {
  leadsRecebidos: Set<number>;             // leads criados no canal no período
  leadsRecebidosComSdr: Set<number>;       // recebidos com custom field SDR preenchido
  leadsQualificados: Set<number>;          // qualquer marco de qualificação (auto + manual)
  leadsQualificadosSdr: Set<number>;       // qualif manual feita por SDR + lead com SDR no CF
  qualPorSdr: Record<string, Set<number>>;            // qualificados manuais com SDR no CF
  recebidosPorSdr: Record<string, Set<number>>;        // recebidos atribuídos ao SDR (denominador individual)
  serieMensal: Array<{
    mes: string;
    leadsRecebidos: number;
    leadsQualificados: number;
    leadsQualificadosSdr: number;
    taxaGeral: number;
    taxaSdr: number;
  }>;
}

export function Bloco5Qualificacao({ movimentos, sdrs }: Props) {
  const sdrNames = useMemo(() => new Set(sdrs.map((s) => s.nome)), [sdrs]);
  const [canal, setCanal] = useState<Canal>('geral');
  const { data: sdrMap } = useLeadsSDRMap();
  const { data: leadsFechados } = useLeadsFechados();

  // Classifica cada lead: qual é o canal onde ele foi CRIADO.
  // Pré-requisito do prop `movimentos`: já vem filtrado por lead_created_at no período
  // (via useMovimentosLeadsCriados). Base = leads nascidos no canal.
  const stats = useMemo<Record<Canal, CanalStats>>(() => {
    const insta = new Set<number>();     // lead criado em Recepção Leads Insta
    const whatsapp = new Set<number>();  // lead criado em Vendas WhatsApp

    // Primeiro movimento de cada lead (por ordem cronológica dos dados recebidos)
    const firstMovByLead = new Map<number, MovimentoLead>();
    for (const m of movimentos) {
      const cur = firstMovByLead.get(m.lead_id);
      if (!cur || new Date(m.moved_at) < new Date(cur.moved_at)) firstMovByLead.set(m.lead_id, m);
    }
    for (const [leadId, m] of firstMovByLead) {
      // Lead "criado" em um pipeline = primeiro movimento com pipeline_from NULL
      // (Kommo grava um evento sintético de criação). Alternativa: se o primeiro
      // movimento conhecido já é em Insta/Vendas, assume criação lá.
      if (m.pipeline_from === null) {
        if (m.pipeline_to === RECEPCAO) insta.add(leadId);
        else if (m.pipeline_to === VENDAS_WPP) whatsapp.add(leadId);
      } else {
        // Fallback: considerar o primeiro pipeline observado
        if (m.pipeline_from === RECEPCAO || m.pipeline_to === RECEPCAO) insta.add(leadId);
        else if (m.pipeline_from === VENDAS_WPP || m.pipeline_to === VENDAS_WPP) whatsapp.add(leadId);
      }
    }
    const geral = new Set<number>([...insta, ...whatsapp]);

    // Marcos de qualificação (inclui automática)
    const isQualMov = (m: MovimentoLead) =>
      (m.pipeline_from === RECEPCAO && m.pipeline_to === VENDAS_WPP) ||
      isQualificadoSDRById(m.status_to_id);

    // Qualificação POR SDR exige 2 condições:
    //   (a) movimentação manual para o marco — moved_by é um SDR humano
    //   (b) o lead tem o custom field SDR preenchido (cubo_leads_consolidado.sdr)
    const qualificados = new Set<number>();             // qualquer marco (auto + manual)
    const qualificadosSdr = new Set<number>();          // (a) ∧ (b)
    const qualPorSdrAll: Record<string, Set<number>> = {};
    for (const m of movimentos) {
      if (!isQualMov(m)) continue;
      qualificados.add(m.lead_id);
      const sdrCustomField = sdrMap?.get(m.lead_id);
      const movedByIsSdr = m.moved_by != null && sdrNames.has(m.moved_by);
      if (sdrCustomField && sdrNames.has(sdrCustomField) && movedByIsSdr) {
        qualificadosSdr.add(m.lead_id);
        // Atribui pelo custom field SDR (não pelo moved_by) — Julia
        if (!qualPorSdrAll[sdrCustomField]) qualPorSdrAll[sdrCustomField] = new Set();
        qualPorSdrAll[sdrCustomField].add(m.lead_id);
      }
    }

    const build = (leadsSet: Set<number>): CanalStats => {
      // Numerador "geral" — todos qualificados (auto + manual) que estão na base do canal
      const qGeral = new Set<number>();
      for (const id of qualificados) if (leadsSet.has(id)) qGeral.add(id);
      // Numerador "SDR" — apenas qualificados manuais com SDR no CF
      const qSdrSet = new Set<number>();
      for (const id of qualificadosSdr) if (leadsSet.has(id)) qSdrSet.add(id);
      // Denominador "SDR" — leads recebidos com SDR no CF
      const recebidosComSdr = new Set<number>();
      // E denominador individual por SDR — leads recebidos atribuídos a cada SDR
      const recebidosPorSdr: Record<string, Set<number>> = {};
      for (const id of leadsSet) {
        const sdr = sdrMap?.get(id);
        if (sdr && sdrNames.has(sdr)) {
          recebidosComSdr.add(id);
          if (!recebidosPorSdr[sdr]) recebidosPorSdr[sdr] = new Set();
          recebidosPorSdr[sdr].add(id);
        }
      }
      const qSdr: Record<string, Set<number>> = {};
      for (const [sdr, ids] of Object.entries(qualPorSdrAll)) {
        const inter = new Set<number>();
        for (const id of ids) if (leadsSet.has(id)) inter.add(id);
        if (inter.size > 0) qSdr[sdr] = inter;
      }

      // Série mensal — bucket pelo mês de CRIAÇÃO do lead (denominador coerente com a base).
      const recebidosPorMes: Record<string, Set<number>> = {};
      // Mapa lead_id → created_at (usa o primeiro movimento)
      const createdByLead = new Map<number, string>();
      for (const m of movimentos) {
        if (!leadsSet.has(m.lead_id)) continue;
        const created = m.lead_created_at || m.moved_at;
        if (!createdByLead.has(m.lead_id)) createdByLead.set(m.lead_id, created);
      }
      for (const [leadId, created] of createdByLead) {
        const d = new Date(created);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!recebidosPorMes[key]) recebidosPorMes[key] = new Set();
        recebidosPorMes[key].add(leadId);
      }

      // Qualificados por mês (mesmo mês de criação do lead)
      const qualGeralPorMes: Record<string, Set<number>> = {};
      const qualSdrPorMes: Record<string, Set<number>> = {};
      for (const m of movimentos) {
        if (!isQualMov(m)) continue;
        if (!leadsSet.has(m.lead_id)) continue;
        const created = createdByLead.get(m.lead_id);
        if (!created) continue;
        const d = new Date(created);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!qualGeralPorMes[key]) qualGeralPorMes[key] = new Set();
        qualGeralPorMes[key].add(m.lead_id);
        if (qualificadosSdr.has(m.lead_id)) {
          if (!qualSdrPorMes[key]) qualSdrPorMes[key] = new Set();
          qualSdrPorMes[key].add(m.lead_id);
        }
      }
      const keys = new Set([
        ...Object.keys(recebidosPorMes),
        ...Object.keys(qualGeralPorMes),
        ...Object.keys(qualSdrPorMes),
      ]);
      const serieMensal = Array.from(keys)
        .sort()
        .map((key) => {
          const rec = recebidosPorMes[key]?.size || 0;
          const qg = qualGeralPorMes[key]?.size || 0;
          const qs = qualSdrPorMes[key]?.size || 0;
          // Recebidos com SDR no mês — pra denominador da taxa SDR mensal
          let recComSdr = 0;
          for (const id of recebidosPorMes[key] || []) if (sdrMap?.get(id)) recComSdr++;
          return {
            mes: key,
            leadsRecebidos: rec,
            leadsQualificados: qg,
            leadsQualificadosSdr: qs,
            taxaGeral: rec > 0 ? (qg / rec) * 100 : 0,
            taxaSdr: recComSdr > 0 ? (qs / recComSdr) * 100 : 0,
          };
        });

      return {
        leadsRecebidos: leadsSet,
        leadsRecebidosComSdr: recebidosComSdr,
        leadsQualificados: qGeral,
        leadsQualificadosSdr: qSdrSet,
        qualPorSdr: qSdr,
        recebidosPorSdr,
        serieMensal,
      };
    };

    return {
      insta: build(insta),
      whatsapp: build(whatsapp),
      geral: build(geral),
    };
  }, [movimentos, sdrNames, sdrMap]);

  const atual = stats[canal];
  const totalRecebidos = atual.leadsRecebidos.size;
  const totalRecebidosComSdr = atual.leadsRecebidosComSdr.size;
  const totalQualificados = atual.leadsQualificados.size;
  const totalQualificadosSdr = atual.leadsQualificadosSdr.size;
  const taxaGeral = totalRecebidos > 0 ? (totalQualificados / totalRecebidos) * 100 : 0;
  const taxaSdr = totalRecebidosComSdr > 0 ? (totalQualificadosSdr / totalRecebidosComSdr) * 100 : 0;

  // ── Conversão para Venda ────────────────────────────────────────────────────
  // Conversão por canal — só faz sentido na aba Geral
  const conversaoPorCanal = useMemo(() => {
    if (!leadsFechados) return [];
    const calc = (s: Set<number>) => {
      let fechados = 0;
      for (const id of s) if (leadsFechados.has(id)) fechados++;
      return { recebidos: s.size, fechados, taxa: s.size > 0 ? (fechados / s.size) * 100 : 0 };
    };
    const i = calc(stats.insta.leadsRecebidos);
    const w = calc(stats.whatsapp.leadsRecebidos);
    return [
      { canal: 'Instagram', ...i },
      { canal: 'WhatsApp', ...w },
    ];
  }, [stats, leadsFechados]);

  // Conversão por SDR no canal ativo
  const conversaoPorSdr = useMemo(() => {
    if (!leadsFechados) return [];
    const sdrs = Object.entries(atual.recebidosPorSdr);
    return sdrs
      .map(([sdr, ids]) => {
        let fechados = 0;
        for (const id of ids) if (leadsFechados.has(id)) fechados++;
        return {
          sdr,
          atribuidos: ids.size,
          fechados,
          taxa: ids.size > 0 ? (fechados / ids.size) * 100 : 0,
        };
      })
      .filter((r) => r.atribuidos > 0)
      .sort((a, b) => b.taxa - a.taxa);
  }, [atual, leadsFechados]);

  const taxaPorSdr = useMemo(() => {
    // Inclui todos os SDRs que tiveram leads atribuídos (mesmo com 0 qualificações)
    const sdrs = new Set<string>([
      ...Object.keys(atual.qualPorSdr),
      ...Object.keys(atual.recebidosPorSdr),
    ]);
    return Array.from(sdrs)
      .map((sdr) => {
        const qualif = atual.qualPorSdr[sdr]?.size ?? 0;
        const atribuidos = atual.recebidosPorSdr[sdr]?.size ?? 0;
        return {
          sdr,
          qualificados: qualif,
          atribuidos,
          // Taxa individual = qualificou / leads que recebeu (denominador específico)
          taxa: atribuidos > 0 ? (qualif / atribuidos) * 100 : 0,
        };
      })
      .filter((r) => r.atribuidos > 0)
      .sort((a, b) => b.taxa - a.taxa);
  }, [atual]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          A — Conversão Pré-venda (Qualificação)
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Qualificado = lead movido de <strong>Recepção Leads Insta → Vendas WhatsApp</strong> ou que
          passou pela etapa <strong>Qualificado SDR</strong> no funil de Vendas WhatsApp. Numerador considera
          apenas leads com o custom field <code>SDR</code> preenchido (qualificações atribuídas a um SDR humano).
        </p>

        {/* Tabs de canal */}
        <div className="card-glass p-1 rounded-xl inline-flex gap-1">
          {CANAIS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCanal(id)}
              className={`px-4 py-1.5 rounded-lg text-xs transition-colors ${
                canal === id
                  ? 'bg-primary text-white font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs — 2 taxas + 3 contadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Taxa de Qualificação Geral</p>
          <p className="text-4xl font-bold text-foreground">{formatPct(taxaGeral)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatNumber(totalQualificados)} qualif (auto + manual) / {formatNumber(totalRecebidos)} recebidos
          </p>
        </div>
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Taxa de Qualificação SDR</p>
          <p className="text-4xl font-bold text-foreground">{formatPct(taxaSdr)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatNumber(totalQualificadosSdr)} qualif manual c/ SDR / {formatNumber(totalRecebidosComSdr)} atribuídos a SDR
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Total de Leads Recebidos</p>
          <p className="text-3xl font-bold text-foreground">{formatNumber(totalRecebidos)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {canal === 'insta' && 'Criados em Recepção Leads Insta'}
            {canal === 'whatsapp' && 'Criados em Vendas WhatsApp'}
            {canal === 'geral' && 'Soma Insta + WhatsApp'}
          </p>
        </div>
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Total de Leads Qualificados</p>
          <p className="text-3xl font-bold text-foreground">{formatNumber(totalQualificados)}</p>
          <p className="text-xs text-muted-foreground mt-1">Inclui automações + manuais</p>
        </div>
        <div className="card-glass p-4 rounded-xl text-center">
          <p className="text-sm text-muted-foreground">Total de Qualificados por SDR</p>
          <p className="text-3xl font-bold text-foreground">{formatNumber(totalQualificadosSdr)}</p>
          <p className="text-xs text-muted-foreground mt-1">Manual + custom field SDR preenchido</p>
        </div>
      </div>

      {/* Taxa individual por SDR */}
      <div className="card-glass p-4 rounded-xl">
        <div className="flex items-start justify-between mb-4 gap-4">
          <h3 className="text-base font-semibold text-foreground">Taxa de Qualificação por SDR</h3>
          <p className="text-[11px] text-muted-foreground italic text-right max-w-md">
            qualificados_do_sdr / leads_atribuídos_ao_sdr (denominador individual). Atribuição vem do custom field <code>SDR</code> do lead.
          </p>
        </div>
        {taxaPorSdr.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum SDR teve leads atribuídos no período neste canal.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, taxaPorSdr.length * 36)}>
            <BarChart data={taxaPorSdr} layout="vertical" margin={{ left: 20, right: 110, top: 10, bottom: 10 }}>
              <CartesianGrid stroke="hsl(240, 4%, 16%)" horizontal={false} />
              <XAxis type="number" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }}
                tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <YAxis type="category" dataKey="sdr" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }}
                width={120} />
              <Tooltip {...TOOLTIP_STYLE}
                formatter={(value: number, _n: string, p: any) =>
                  [`${formatPct(value)} — ${formatNumber(p.payload.qualificados)} de ${formatNumber(p.payload.atribuidos)}`, 'Taxa']} />
              <Bar dataKey="taxa" fill={COLORS.green} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="taxa" position="right" fill={COLORS.muted} fontSize={11} fontWeight={600}
                  formatter={(v: number) => formatPct(v)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Série mensal */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">
          Evolução Mensal — Leads Recebidos + Taxas (Geral e SDR)
        </h3>
        {atual.serieMensal.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período selecionado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={atual.serieMensal} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
              <CartesianGrid stroke="hsl(240, 4%, 16%)" />
              <XAxis dataKey="mes" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 11 }} />
              <YAxis yAxisId="left" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" stroke={COLORS.muted}
                tick={{ fill: COLORS.muted, fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip {...TOOLTIP_STYLE}
                formatter={(value: number, name: string) => {
                  if (name === 'Taxa Geral' || name === 'Taxa SDR') return [formatPct(value), name];
                  return [formatNumber(value), name];
                }} />
              <Legend wrapperStyle={{ fontSize: 12, color: COLORS.muted }} />
              <Bar yAxisId="left" dataKey="leadsRecebidos" name="Leads Recebidos" fill={COLORS.purple}
                radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="taxaGeral" name="Taxa Geral" stroke={COLORS.gold}
                strokeWidth={2} dot={{ r: 4, fill: COLORS.gold }} />
              <Line yAxisId="right" type="monotone" dataKey="taxaSdr" name="Taxa SDR" stroke={COLORS.green}
                strokeWidth={2} dot={{ r: 4, fill: COLORS.green }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* B — Conversão para Venda */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">B — Conversão para Venda</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Conversão = leads recebidos no canal/SDR que viraram <code>Venda Fechada</code> em algum momento.
        </p>

        {/* Por canal — só aba Geral */}
        {canal === 'geral' && (
          <div className="card-glass p-4 rounded-xl mb-4">
            <h3 className="text-base font-semibold text-foreground mb-4">Conversão para Venda por Canal</h3>
            {conversaoPorCanal.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={conversaoPorCanal} layout="vertical" margin={{ left: 30, right: 100, top: 10, bottom: 10 }}>
                  <CartesianGrid stroke="hsl(240, 4%, 16%)" horizontal={false} />
                  <XAxis type="number" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }}
                    tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <YAxis type="category" dataKey="canal" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }} width={90} />
                  <Tooltip {...TOOLTIP_STYLE}
                    formatter={(value: number, _n: string, p: any) =>
                      [`${formatPct(value)} — ${formatNumber(p.payload.fechados)} de ${formatNumber(p.payload.recebidos)}`, 'Conversão']} />
                  <Bar dataKey="taxa" fill={COLORS.purple} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="taxa" position="right" fill={COLORS.muted} fontSize={11} fontWeight={600}
                      formatter={(v: number) => formatPct(v)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Por SDR — em todas as abas */}
        <div className="card-glass p-4 rounded-xl">
          <div className="flex items-start justify-between mb-4 gap-4">
            <h3 className="text-base font-semibold text-foreground">Conversão para Venda por SDR</h3>
            <p className="text-[11px] text-muted-foreground italic text-right max-w-md">
              fechados_do_sdr / leads_atribuídos_ao_sdr (denominador individual). "Fechado" = lead com <code>status_lead='Venda Fechada'</code>.
            </p>
          </div>
          {conversaoPorSdr.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum SDR com leads atribuídos no período neste canal.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(240, conversaoPorSdr.length * 36)}>
              <BarChart data={conversaoPorSdr} layout="vertical" margin={{ left: 20, right: 110, top: 10, bottom: 10 }}>
                <CartesianGrid stroke="hsl(240, 4%, 16%)" horizontal={false} />
                <XAxis type="number" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <YAxis type="category" dataKey="sdr" stroke={COLORS.muted} tick={{ fill: COLORS.muted, fontSize: 12 }} width={120} />
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(value: number, _n: string, p: any) =>
                    [`${formatPct(value)} — ${formatNumber(p.payload.fechados)} de ${formatNumber(p.payload.atribuidos)}`, 'Conversão']} />
                <Bar dataKey="taxa" fill={COLORS.purple} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="taxa" position="right" fill={COLORS.muted} fontSize={11} fontWeight={600}
                    formatter={(v: number) => formatPct(v)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default Bloco5Qualificacao;
