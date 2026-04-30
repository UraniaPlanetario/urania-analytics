import type { Filtros } from '../types';

interface Props {
  filtros: Filtros;
}

/** Aba Hoje — snapshot atual do funil (sem filtro de data). Construído em
 *  fases: KPIs/básicos (fase 2), auditoria de tarefas (fase 3),
 *  divergências + tempo sem interação (fase 4). */
export function HojeBlock({ filtros: _filtros }: Props) {
  return (
    <div className="card-glass p-12 rounded-xl text-center">
      <p className="text-lg font-semibold text-foreground">Aba "Hoje" — em construção</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Próximas entregas: KPIs do dia, leads por responsável, leads por etapa, tempo total no funil,
        auditoria de tarefas vencidas / sem tarefa, divergências de responsável e tempo sem interação.
      </p>
    </div>
  );
}
