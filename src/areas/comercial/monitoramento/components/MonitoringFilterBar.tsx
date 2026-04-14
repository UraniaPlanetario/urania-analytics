import { useMemo } from 'react';
import { X } from 'lucide-react';
import { UserActivity, MonitoringFilters, CATEGORY_COLORS } from '../types';

interface Props {
  activities: UserActivity[];
  filters: MonitoringFilters;
  onFiltersChange: (f: MonitoringFilters) => void;
}

export function MonitoringFilterBar({ activities, filters, onFiltersChange }: Props) {
  const users = useMemo(() => {
    return Array.from(new Set(activities.map((a) => a.user_name))).sort();
  }, [activities]);

  const categories = useMemo(() => {
    return Array.from(new Set(activities.map((a) => a.category))).sort();
  }, [activities]);

  const hasFilters = filters.users.length > 0 || filters.categories.length > 0 ||
    filters.dateRange.from || filters.dateRange.to;

  const toggleUser = (u: string) => {
    const next = filters.users.includes(u)
      ? filters.users.filter((x) => x !== u)
      : [...filters.users, u];
    onFiltersChange({ ...filters, users: next });
  };

  const toggleCategory = (c: string) => {
    const next = filters.categories.includes(c)
      ? filters.categories.filter((x) => x !== c)
      : [...filters.categories, c];
    onFiltersChange({ ...filters, categories: next });
  };

  return (
    <div className="card-glass p-4 mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Filtros</h3>
        {hasFilters && (
          <button
            onClick={() => onFiltersChange({ users: [], categories: [], dateRange: { from: null, to: null } })}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Usuário</label>
          <select
            className="w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground"
            value=""
            onChange={(e) => e.target.value && toggleUser(e.target.value)}
          >
            <option value="">Selecionar usuário...</option>
            {users.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          {filters.users.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {filters.users.map((u) => (
                <span key={u} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                  {u} <X size={10} className="cursor-pointer" onClick={() => toggleUser(u)} />
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
          <select
            className="w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground"
            value=""
            onChange={(e) => e.target.value && toggleCategory(e.target.value)}
          >
            <option value="">Selecionar categoria...</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {filters.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {filters.categories.map((c) => (
                <span
                  key={c}
                  className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: (CATEGORY_COLORS[c] || 'hsl(263, 70%, 58%)') + '33', color: CATEGORY_COLORS[c] || 'hsl(263, 70%, 58%)' }}
                >
                  {c} <X size={10} className="cursor-pointer" onClick={() => toggleCategory(c)} />
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Período</label>
          <div className="flex gap-1">
            <input type="date"
              className="flex-1 px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground"
              value={filters.dateRange.from?.toISOString().split('T')[0] || ''}
              onChange={(e) => onFiltersChange({ ...filters, dateRange: { ...filters.dateRange, from: e.target.value ? new Date(e.target.value) : null }})}
            />
            <input type="date"
              className="flex-1 px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground"
              value={filters.dateRange.to?.toISOString().split('T')[0] || ''}
              onChange={(e) => onFiltersChange({ ...filters, dateRange: { ...filters.dateRange, to: e.target.value ? new Date(e.target.value) : null }})}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
