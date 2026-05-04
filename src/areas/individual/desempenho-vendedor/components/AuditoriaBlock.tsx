interface Props {
  kommoUserId: number;
}

/** Aba Auditoria Funil de Vendas (Vendas WhatsApp) — KPIs (leads atribuídos,
 *  tarefas vencidas, sem tarefa) + gráfico por etapa + 3 tabelas
 *  (vencidas, sem tarefa, tempo sem interação). Construída na fase 3. */
export function AuditoriaBlock({ kommoUserId: _k }: Props) {
  return (
    <div className="card-glass p-12 rounded-xl text-center">
      <p className="text-lg font-semibold text-foreground">Auditoria — em construção</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Em breve: KPIs de leads ativos no Vendas WhatsApp pelos quais você é responsável,
        tarefas vencidas, leads sem tarefa, distribuição por etapa e tabelas detalhadas.
      </p>
    </div>
  );
}
