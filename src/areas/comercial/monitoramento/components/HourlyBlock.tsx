import { useMemo } from 'react';
import { UserActivity } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

export function HourlyBlock({ activities }: { activities: UserActivity[] }) {
  const hourly = useMemo(() => {
    const map: Record<number, number> = {};
    for (let h = 0; h < 24; h++) map[h] = 0;
    for (const a of activities) {
      map[a.activity_hour] = (map[a.activity_hour] || 0) + a.activity_count;
    }
    return Array.from({ length: 24 }, (_, h) => ({
      hour: String(h).padStart(2, '0') + 'h',
      count: map[h],
    }));
  }, [activities]);

  const byUserByHour = useMemo(() => {
    const users = new Set<string>();
    const map: Record<string, Record<number, number>> = {};
    for (const a of activities) {
      users.add(a.user_name);
      if (!map[a.user_name]) map[a.user_name] = {};
      map[a.user_name][a.activity_hour] = (map[a.user_name][a.activity_hour] || 0) + a.activity_count;
    }

    const topUsers = Array.from(users)
      .map((u) => ({ name: u, total: Object.values(map[u]).reduce((s, n) => s + n, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((x) => x.name);

    return { users: topUsers, map };
  }, [activities]);

  return (
    <div className="space-y-6">
      {/* Hourly total */}
      <div className="card-glass p-4 rounded-xl">
        <h3 className="text-base font-semibold text-foreground mb-4">Atividades por Hora (total)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={hourly}>
            <XAxis dataKey="hour" stroke="hsl(240, 5%, 65%)" tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }} />
            <YAxis stroke="hsl(240, 5%, 65%)" />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" fill="hsl(270, 50%, 70%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-user hourly heatmap */}
      <div className="card-glass p-4 rounded-xl overflow-x-auto">
        <h3 className="text-base font-semibold text-foreground mb-4">Mapa de Atividade por Hora (Top 10 usuários)</h3>
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium sticky left-0 bg-card">Usuário</th>
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="text-center py-2 px-1 text-muted-foreground font-medium">{String(h).padStart(2, '0')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byUserByHour.users.map((user) => {
              const row = byUserByHour.map[user] || {};
              const maxVal = Math.max(...Object.values(row), 1);
              return (
                <tr key={user} className="border-t border-border/30">
                  <td className="py-2 px-2 text-foreground font-medium sticky left-0 bg-card whitespace-nowrap">{user}</td>
                  {Array.from({ length: 24 }, (_, h) => {
                    const val = row[h] || 0;
                    const intensity = val / maxVal;
                    return (
                      <td key={h} className="text-center py-1 px-0.5">
                        <div
                          className="h-6 rounded flex items-center justify-center text-[10px]"
                          style={{
                            backgroundColor: val > 0 ? `hsl(263, 70%, ${Math.max(25, 60 - intensity * 40)}%)` : 'hsl(260, 20%, 14%)',
                            color: val > 0 ? '#fff' : 'transparent',
                          }}
                          title={`${user} - ${String(h).padStart(2, '0')}h: ${val}`}
                        >
                          {val > 0 ? val : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
