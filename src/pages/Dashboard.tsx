import { useState } from 'react';
import { useLeadsData, useFilteredLeads } from '@/hooks/useLeadsData';
import { Filters } from '@/types/leads';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { FilterBar } from '@/components/layout/FilterBar';
import { QualityBlock } from '@/components/dashboard/QualityBlock';
import { SellerBlock } from '@/components/dashboard/SellerBlock';
import { DiagnosticBlock } from '@/components/dashboard/DiagnosticBlock';
import { ContextBlock } from '@/components/dashboard/ContextBlock';
import { CommercialBlock } from '@/components/dashboard/CommercialBlock';
import { QualitativeBlock } from '@/components/dashboard/QualitativeBlock';
import { Loader2 } from 'lucide-react';

interface DashboardProps { onLogout: () => void; }

export default function Dashboard({ onLogout }: DashboardProps) {
  const { data: leads = [], isLoading, error } = useLeadsData();
  const [activeSection, setActiveSection] = useState('qualidade');
  const [filters, setFilters] = useState<Filters>({
    vendedores: [], scores: [],
    dateRange: { from: null, to: null },
    closeDateRange: { from: null, to: null },
  });
  const filtered = useFilteredLeads(leads, filters);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="card-glass p-8 text-center">
        <p className="text-destructive font-medium">Erro ao carregar dados</p>
        <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} onLogout={onLogout} />
      <main className="ml-56 p-6">
        <FilterBar leads={leads} filters={filters} onFiltersChange={setFilters} />
        <div className="max-w-6xl">
          {activeSection === 'qualidade' && <QualityBlock leads={filtered} />}
          {activeSection === 'vendedores' && <SellerBlock leads={filtered} />}
          {activeSection === 'diagnostico' && <DiagnosticBlock leads={filtered} />}
          {activeSection === 'contexto' && <ContextBlock leads={filtered} />}
          {activeSection === 'comercial' && <CommercialBlock leads={filtered} />}
          {activeSection === 'qualitativo' && <QualitativeBlock leads={filtered} />}
        </div>
      </main>
    </div>
  );
}
