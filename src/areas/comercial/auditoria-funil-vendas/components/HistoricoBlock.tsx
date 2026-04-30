import type { Filtros } from '../types';

interface Props {
  filtros: Filtros;
}

/** Aba Histórico — análise do funil no período filtrado. Construído em
 *  fases: KPIs + passagem por etapa + estagnados + tempo médio + criados/hora
 *  (fase 5), funis Ganha/Perdida + cards de tempo médio (fase 6). */
export function HistoricoBlock({ filtros: _filtros }: Props) {
  return (
    <div className="card-glass p-12 rounded-xl text-center">
      <p className="text-lg font-semibold text-foreground">Aba "Histórico" — em construção</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Próximas entregas: KPIs (criados, perdidos), passagem por etapa, leads estagnados,
        tempo médio por etapa, criados por hora (média + total), funil Venda Ganha,
        funil Venda Perdida e cards de tempo médio na/após etapa filtrada.
      </p>
    </div>
  );
}
