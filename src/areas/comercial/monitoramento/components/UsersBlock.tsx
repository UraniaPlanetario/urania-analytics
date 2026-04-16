import { useMemo, useState } from 'react';
import { UserActivity, CATEGORY_COLORS } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

const EXCLUDED_CATEGORIES = ['Tag', 'Vinculacao'];

const TABS: { id: string; label: string }[] = [
  { id: 'Todas', label: 'Todas' },
  { id: 'Mensagem Enviada', label: 'Mensagem Enviada' },
  { id: 'Tarefa', label: 'Tarefa' },
  { id: 'Nota', label: 'Nota' },
  { id: 'Movimentacao', label: 'Movimentacao' },
  { id: 'Campo alterado', label: 'Campo alterado' },
  { id: 'Conversa', label: 'Conversa' },
  { id: 'Ligacao', label: 'Ligacao' },
  { id: 'E-mail', label: 'E-mail' },
  { id: 'Outros', label: 'Outros' },
];

export function UsersBlock({ activities }: { activities: UserActivity[] }) {
  const [activeTab, setActiveTab] = useState('Todas');

  const filteredActivities = useMemo(
    () => activities.filter((a) => !EXCLUDED_CATEGORIES.includes(a.category)),
    [activities],
  );

  const byUser = useMemo(() => {
    const map: Record<string, { total: number; categories: Record<string, number> }> = {};
    for (const a of filteredActivities) {
      if (!map[a.user_name]) map[a.user_name] = { total: 0, categories: {} };
      map[a.user_name].total += a.activity_count;
      map[a.user_name].categories[a.category] =
        (map[a.user_name].categories[a.category] || 0) + a.activity_count;
    }
    return Object.entries(map)
      .map(([name, { total, categories }]) => ({ name, total, ...categories }))
      .sort((a, b) => b.total - a.total);
  }, [filteredActivities]);

  const avgTotal = useMemo(() => {
    if (byUser.length === 0) return 0;
    return Math.round(byUser.reduce((s, u) => s + u.total, 0) / byUser.length);
  }, [byUser]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const a of filteredActivities) set.add(a.category);
    return Array.from(set);
  }, [filteredActivities]);

  // Data for a specific category tab
  const categoryData = useMemo(() => {
    if (activeTab === 'Todas') return null;
    const map: Record<string, number> = {};
    for (const a of filteredActivities) {
      if (a.category === activeTab) {
        map[a.user_name] = (map[a.user_name] || 0) + a.activity_count;
      }
    }
    const rows = Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const avg = rows.length === 0 ? 0 : Math.round(rows.reduce((s, r) => s + r.count, 0) / rows.length);
    return { rows, avg };
  }, [filteredActivities, activeTab]);

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="card-glass p-1 rounded-xl mb-6 flex flex-wrap gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              activeTab === id
                ? 'bg-primary text-white font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'Todas' ? (
        <>
          {/* Total by user - horizontal bar with avg line */}
          <div className="card-glass p-4 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Atividades por Usuário</h3>
              <p className="text-xs text-muted-foreground">
                Linha tracejada = média da equipe ({avgTotal.toLocaleString('pt-BR')})
              </p>
            </div>
            <ResponsiveContainer width="100%" height={Math.max(300, byUser.length * 32)}>
              <BarChart data={byUser} layout="vertical" margin={{ left: 130 }}>
                <XAxis type="number" stroke="hsl(240, 5%, 65%)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(240, 5%, 65%)"
                  width={125}
                  tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }}
                />
                <Tooltip {...TOOLTIP_STYLE} />
                <ReferenceLine x={avgTotal} stroke="hsl(45, 80%, 55%)" strokeDasharray="4 4" />
                <Bar dataKey="total" fill="hsl(263, 70%, 58%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stacked by category */}
          <div className="card-glass p-4 rounded-xl">
            <h3 className="text-base font-semibold text-foreground mb-4">
              Mix de Atividades por Usuário
            </h3>
            <ResponsiveContainer width="100%" height={Math.max(300, byUser.length * 32)}>
              <BarChart data={byUser} layout="vertical" margin={{ left: 130 }} stackOffset="expand">
                <XAxis
                  type="number"
                  stroke="hsl(240, 5%, 65%)"
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(240, 5%, 65%)"
                  width={125}
                  tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number) => value.toLocaleString('pt-BR')}
                />
                {allCategories.map((cat) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="a"
                    fill={CATEGORY_COLORS[cat] || 'hsl(240, 5%, 50%)'}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {allCategories.map((cat) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] || 'hsl(240, 5%, 50%)' }}
                  />
                  <span className="text-xs text-muted-foreground">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Single category view */
        <div className="card-glass p-4 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">{activeTab} por Usuário</h3>
            <p className="text-xs text-muted-foreground">
              Linha tracejada = média da equipe ({(categoryData?.avg ?? 0).toLocaleString('pt-BR')})
            </p>
          </div>
          {categoryData && categoryData.rows.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, categoryData.rows.length * 32)}>
              <BarChart data={categoryData.rows} layout="vertical" margin={{ left: 130 }}>
                <XAxis type="number" stroke="hsl(240, 5%, 65%)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(240, 5%, 65%)"
                  width={125}
                  tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }}
                />
                <Tooltip {...TOOLTIP_STYLE} />
                <ReferenceLine x={categoryData.avg} stroke="hsl(45, 80%, 55%)" strokeDasharray="4 4" />
                <Bar
                  dataKey="count"
                  fill={CATEGORY_COLORS[activeTab] || 'hsl(240, 5%, 50%)'}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade encontrada para esta categoria.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
