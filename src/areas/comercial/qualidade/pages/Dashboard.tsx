import { useState } from 'react';
import { useLeadsData, useFilteredLeads } from '../hooks/useLeadsData';
import { Filters } from '../types';
import { FilterBar } from '@/components/layout/FilterBar';
import { QualityBlock } from '../components/QualityBlock';
import { SellerBlock } from '../components/SellerBlock';
import { DiagnosticBlock } from '../components/DiagnosticBlock';
import { ContextBlock } from '../components/ContextBlock';
import { CommercialBlock } from '../components/CommercialBlock';
import { QualitativeBlock } from '../components/QualitativeBlock';
import { Loader2 } from 'lucide-react';

const SECTIONS = [
  { id: 'qualidade', label: 'Qualidade' },
  { id: 'vendedores', label: 'Vendedores' },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'contexto', label: 'Contexto' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'qualitativo', label: 'Qualitativo' },
];

export default function Dashboard() {
  const { data: leads = [], isLoading, error } = useLeadsData();
  const [activeSection, setActiveSection] = useState('qualidade');
  const [filters, setFilters] = useState<Filters>({
    vendedores: [], scores: [],
    dateRange: { from: null, to: null },
    closeDateRange: { from: null, to: null },
  });
  const filtered = useFilteredLeads(leads, filters);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-20">
      <div className="card-glass p-8 text-center">
        <p className="text-destructive font-medium">Erro ao carregar dados</p>
        <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
      </div>
    </div>
  );

  return (
    <div>
      <FilterBar leads={leads} filters={filters} onFiltersChange={setFilters} />

      {/* Tabs inline */}
      <div className="card-glass p-1 rounded-xl mb-6 flex flex-wrap gap-1">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              activeSection === id
                ? 'bg-primary text-white font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl">
        {activeSection === 'qualidade' && <QualityBlock leads={filtered} />}
        {activeSection === 'vendedores' && <SellerBlock leads={filtered} />}
        {activeSection === 'diagnostico' && <DiagnosticBlock leads={filtered} />}
        {activeSection === 'contexto' && <ContextBlock leads={filtered} />}
        {activeSection === 'comercial' && <CommercialBlock leads={filtered} />}
        {activeSection === 'qualitativo' && <QualitativeBlock leads={filtered} />}
      </div>
    </div>
  );
}
