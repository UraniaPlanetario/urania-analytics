import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { FILTROS_DEFAULT, type Filtros } from '../types';
import { useResponsaveisFunil, useUltimoSync } from '../hooks/useFunilWhatsapp';
import { FilterBar } from '../components/FilterBar';
import { HojeBlock } from '../components/HojeBlock';
import { HistoricoBlock } from '../components/HistoricoBlock';

const TABS = [
  { id: 'hoje',      label: 'Hoje' },
  { id: 'historico', label: 'Histórico' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function AuditoriaFunilVendasDashboard() {
  const [tab, setTab] = useState<TabId>('hoje');
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_DEFAULT);

  const { data: responsaveis = [], isLoading: respLoading } = useResponsaveisFunil();
  const { data: ultimoSync } = useUltimoSync();

  if (respLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Auditoria Funil de Vendas</h1>
        <p className="text-sm text-muted-foreground">
          Auditoria do funil <strong>Vendas WhatsApp</strong> — leads que foram criados ou movidos
          pra esse pipeline. "Hoje" mostra o snapshot atual; "Histórico" analisa um período de criação.
        </p>
      </div>

      {/* Aviso de defasagem dos dados */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-start gap-2 text-xs">
        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={14} />
        <div className="text-amber-900 dark:text-amber-200">
          <p>
            Sync atualmente diário (~07:15 UTC). A aba <strong>Hoje</strong> reflete o último sync — na
            prática, o estado de ontem por volta dessa hora. Última atualização:{' '}
            <strong>
              {ultimoSync
                ? new Date(ultimoSync).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })
                : '—'}
            </strong>
          </p>
        </div>
      </div>

      <FilterBar
        filtros={filtros}
        onChange={setFiltros}
        responsaveis={responsaveis}
        showDateRange={tab === 'historico'}
      />

      {/* Tabs */}
      <div className="card-glass p-1 rounded-xl flex flex-wrap gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === id
                ? 'bg-primary text-white font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'hoje' && <HojeBlock filtros={filtros} />}
      {tab === 'historico' && <HistoricoBlock filtros={filtros} />}
    </div>
  );
}
