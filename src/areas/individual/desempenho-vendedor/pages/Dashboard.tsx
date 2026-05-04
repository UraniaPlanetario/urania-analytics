import { useState } from 'react';
import { Loader2, AlertCircle, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMeuVendedor, useMeuKommoUserId } from '../hooks/useMeuVendedor';
import { VisaoGeralBlock } from '../components/VisaoGeralBlock';
import { AuditoriaBlock } from '../components/AuditoriaBlock';
import { DesempenhoBlock } from '../components/DesempenhoBlock';

type TabId = 'visao' | 'auditoria' | 'desempenho';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'visao',      label: 'Visão Geral',                 icon: TrendingUp },
  { id: 'auditoria',  label: 'Auditoria Funil de Vendas',   icon: Activity },
  { id: 'desempenho', label: 'Desempenho',                  icon: BarChart3 },
];

export default function MeuDesempenhoVendedorDashboard() {
  const { user } = useAuth();
  const { data: vendedor, isLoading: vLoading } = useMeuVendedor();
  const { data: kommoUserId, isLoading: kLoading } = useMeuKommoUserId();
  const [tab, setTab] = useState<TabId>('visao');

  if (vLoading || kLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Carregando...
      </div>
    );
  }

  // Sem vínculo: mostra mensagem amigável
  if (!vendedor) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Meu Desempenho</h1>
          <p className="text-sm text-muted-foreground">Acesso individual do vendedor</p>
        </div>
        <div className="card-glass p-8 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-amber-500 flex-none" size={20} />
          <div>
            <p className="font-semibold">Seu usuário ainda não está vinculado a um vendedor</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Pra ver seus leads e desempenho, peça pro admin preencher o campo
              "Vendedor/Consultor" no seu perfil em /admin/usuarios. O nome precisa bater
              exatamente com o usado no Kommo (ex: "Karen Medeiros", "Fred Peixoto",
              "Juliana Rodrigues").
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Meu Desempenho</h1>
        <p className="text-sm text-muted-foreground">
          {user?.full_name ? `Olá, ${user.full_name}.` : ''} Vendedor: <strong>{vendedor}</strong>
        </p>
      </div>

      <div className="border-b flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors flex items-center gap-2 ${
              tab === id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'visao' && <VisaoGeralBlock vendedor={vendedor} />}
      {tab === 'auditoria' && (
        kommoUserId
          ? <AuditoriaBlock kommoUserId={kommoUserId} />
          : <div className="card-glass p-8 rounded-xl">
              <p className="text-sm text-muted-foreground">
                Pra ver a Auditoria, seu kommo_user_id precisa estar mapeado também.
                Peça pro admin rodar o sync de usuários do Kommo em /admin/usuarios.
              </p>
            </div>
      )}
      {tab === 'desempenho' && <DesempenhoBlock vendedor={vendedor} />}
    </div>
  );
}
