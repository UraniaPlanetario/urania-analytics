import { X } from 'lucide-react';
import { MultiSelect } from '@/components/MultiSelect';
import { DateRangePicker } from '@/components/DateRangePicker';
import { ETAPAS_FUNIL, FILTROS_DEFAULT, type Filtros } from '../types';

interface Props {
  filtros: Filtros;
  onChange: (next: Filtros) => void;
  responsaveis: string[];
  /** Aba Hoje não usa filtro de período — ela é snapshot. */
  showDateRange: boolean;
}

export function FilterBar({ filtros, onChange, responsaveis, showDateRange }: Props) {
  const etapasOptions = ETAPAS_FUNIL.map((e) => ({ value: String(e.status_id), label: e.status_name }));
  const respOptions = responsaveis.map((r) => ({ value: r, label: r }));

  const hasFiltros =
    filtros.etapas.length > 0 ||
    filtros.responsaveis.length > 0 ||
    filtros.dateRange.from != null ||
    filtros.dateRange.to != null;

  return (
    <div className="card-glass p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Filtros</h3>
        {hasFiltros && (
          <button
            onClick={() => onChange(FILTROS_DEFAULT)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 ${showDateRange ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
        <MultiSelect
          label="Etapa do funil"
          options={etapasOptions}
          value={filtros.etapas.map(String)}
          onChange={(values) => onChange({ ...filtros, etapas: values.map(Number) })}
          placeholder="Todas as etapas"
        />
        <MultiSelect
          label="Usuário responsável"
          options={respOptions}
          value={filtros.responsaveis}
          onChange={(values) => onChange({ ...filtros, responsaveis: values })}
          placeholder="Todos os responsáveis"
        />
        {showDateRange && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Período de criação</label>
            <DateRangePicker
              from={filtros.dateRange.from}
              to={filtros.dateRange.to}
              onChange={(range) => onChange({ ...filtros, dateRange: range })}
              showPresets
            />
          </div>
        )}
      </div>
    </div>
  );
}
