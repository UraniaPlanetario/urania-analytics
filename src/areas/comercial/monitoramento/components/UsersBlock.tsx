import { useMemo } from 'react';
import { UserActivity, CATEGORY_COLORS } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

export function UsersBlock({ activities }: { activities: UserActivity[] }) {
  const byUser = useMemo(() => {
    const map: Record<string, { total: number; categories: Record<string, number> }> = {};
    for (const a of activities) {
      if (!map[a.user_name]) map[a.user_name] = { total: 0, categories: {} };
      map[a.user_name].total += a.activity_count;
      map[a.user_name].categories[a.category] = (map[a.user_name].categories[a.category] || 0) + a.activity_count;
    }
    return Object.entries(map)
      .map(([name, { total, categories }]) => ({ name, total, ...categories }))
      .sort((a, b) => b.total - a.total);
  }, [activities]);

  const avgTotal = useMemo(() => {
    if (byUser.length === 0) return 0;
    return Math.round(byUser.reduce((s, u) => s + u.total, 0) / byUser.length);
  }, [byUser]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const a of activities) set.add(a.category);
    return Array.from(set);
  }, [activities]);

  return (
    <div className="space-y-6">
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
            <YAxis type="category" dataKey="name" stroke="hsl(240, 5%, 65%)" width={125} tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <ReferenceLine x={avgTotal} stroke="hsl(45, 80%, 55%)" strokeDasharray="4 4" />
            <Bar dataKey="total" fill="hsl(263, 70%, 58%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stacked by category */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">Mix de Atividades por Usuário</h3>
        <ResponsiveContainer width="100%" height={Math.max(300, byUser.length * 32)}>
          <BarChart data={byUser} layout="vertical" margin={{ left: 130 }} stackOffset="expand">
            <XAxis type="number" stroke="hsl(240, 5%, 65%)" tickFormatter={(v) => `${Math.round(v * 100)}%`} />
            <YAxis type="category" dataKey="name" stroke="hsl(240, 5%, 65%)" width={125} tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(value: number) => value.toLocaleString('pt-BR')} />
            {allCategories.map((cat) => (
              <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat] || 'hsl(240, 5%, 50%)'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          {allCategories.map((cat) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: CATEGORY_COLORS[cat] || 'hsl(240, 5%, 50%)' }} />
              <span className="text-xs text-muted-foreground">{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
