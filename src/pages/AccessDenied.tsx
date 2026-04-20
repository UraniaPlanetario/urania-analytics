import { ShieldAlert } from 'lucide-react';

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ShieldAlert size={48} className="text-destructive mb-4" />
      <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        Você não tem permissão para acessar este dashboard. Se acredita que deveria ter acesso,
        entre em contato com a administração.
      </p>
    </div>
  );
}
