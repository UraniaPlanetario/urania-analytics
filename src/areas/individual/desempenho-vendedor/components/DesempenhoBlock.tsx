interface Props {
  vendedor: string;
}

/** Aba Desempenho — espelho do /comercial/desempenho-vendedor (gerencial),
 *  filtrado pelo vendedor logado. Construída na fase 4. */
export function DesempenhoBlock({ vendedor: _v }: Props) {
  return (
    <div className="card-glass p-12 rounded-xl text-center">
      <p className="text-lg font-semibold text-foreground">Desempenho — em construção</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Em breve: as mesmas métricas do dashboard gerencial de Desempenho Vendedores,
        mas mostrando só os seus dados.
      </p>
    </div>
  );
}
