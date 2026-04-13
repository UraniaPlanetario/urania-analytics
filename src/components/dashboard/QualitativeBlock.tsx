import { useState, useMemo } from 'react';
import type { LeadQuality } from '@/types/leads';
import { SCORE_COLORS } from '@/types/leads';

interface Props {
  leads: LeadQuality[];
}

export function QualitativeBlock({ leads }: Props) {
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const term = search.toLowerCase();
    return leads.filter((lead) => {
      const fields = [
        lead.observacoes_gerais,
        lead.ponto_positivo,
        lead.ponto_critico,
        lead.lead_name,
        lead.vendedor_consultor,
      ];
      return fields.some((f) => f?.toLowerCase().includes(term));
    });
  }, [leads, search]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const scoreColor = (score: string | null): string => {
    if (!score) return 'inherit';
    return SCORE_COLORS[score] || 'inherit';
  };

  const truncate = (text: string | null, maxLen = 80): string => {
    if (!text) return '—';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Qualitativo</h2>

      {/* Search */}
      <div className="card-glass p-4 rounded-xl">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar em observações, pontos positivos e críticos..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      {/* Table */}
      <div className="card-glass p-4 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-3 text-muted-foreground font-medium w-8"></th>
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Lead</th>
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Vendedor</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Score</th>
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Observações</th>
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Ponto Positivo</th>
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Ponto Crítico</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium">Conhecia Urânia</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => {
              const isExpanded = expandedIds.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
                  onClick={() => toggleExpand(lead.id)}
                >
                  <td className="py-2 px-3 text-muted-foreground">
                    <span
                      className="inline-block transition-transform"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      ▶
                    </span>
                  </td>
                  <td className="py-2 px-3 text-foreground font-medium">
                    {lead.lead_name || '—'}
                  </td>
                  <td className="py-2 px-3 text-foreground">
                    {lead.vendedor_consultor || '—'}
                  </td>
                  <td
                    className="py-2 px-3 text-center font-semibold"
                    style={{ color: scoreColor(lead.score_qualidade) }}
                  >
                    {lead.score_qualidade || '—'}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground max-w-[200px]">
                    {isExpanded
                      ? lead.observacoes_gerais || '—'
                      : truncate(lead.observacoes_gerais)}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground max-w-[200px]">
                    {isExpanded
                      ? lead.ponto_positivo || '—'
                      : truncate(lead.ponto_positivo)}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground max-w-[200px]">
                    {isExpanded
                      ? lead.ponto_critico || '—'
                      : truncate(lead.ponto_critico)}
                  </td>
                  <td className="py-2 px-3 text-center text-foreground">
                    {lead.conhecia_urania || '—'}
                  </td>
                </tr>
              );
            })}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground mt-3">
          Mostrando {filteredLeads.length} de {leads.length} leads. Clique em uma linha para expandir.
        </p>
      </div>
    </section>
  );
}
