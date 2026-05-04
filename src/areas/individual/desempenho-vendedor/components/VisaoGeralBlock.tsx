interface Props {
  vendedor: string;
}

/** Aba Visão Geral — KPIs (leads fech / diárias / canc / ticket) +
 *  filtro de período (criação/fechamento) + tabela com link Kommo.
 *  Construída na fase 2. */
export function VisaoGeralBlock({ vendedor: _v }: Props) {
  return (
    <div className="card-glass p-12 rounded-xl text-center">
      <p className="text-lg font-semibold text-foreground">Visão Geral — em construção</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Em breve: KPIs de leads/diárias/cancelamentos/ticket médio, filtro de período
        (criação ou fechamento) e tabela com seus leads + link pro Kommo.
      </p>
    </div>
  );
}
