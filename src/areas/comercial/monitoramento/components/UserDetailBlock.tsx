import { useMemo, useState } from 'react';
import { UserActivity, CATEGORY_COLORS } from '../types';
import { getISOWeek, getISOWeekYear, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

const EXCLUDED_CATEGORIES = new Set(['Tag', 'Vinculacao']);

export function UserDetailBlock({ activities }: { activities: UserActivity[] }) {
  const [selectedUser, setSelectedUser] = useState<string>('');

  const userNames = useMemo(
    () =>
      Array.from(new Set(activities.map((a) => a.user_name)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [activities],
  );

  const filtered = useMemo(
    () =>
      activities.filter(
        (a) => a.user_name === selectedUser && !EXCLUDED_CATEGORIES.has(a.category),
      ),
    [activities, selectedUser],
  );

  // KPI data
  const kpis = useMemo(() => {
    if (!filtered.length) return null;

    const totalActivities = filtered.reduce((s, a) => s + a.activity_count, 0);
    const distinctDates = new Set(filtered.map((a) => a.activity_date));
    const activeDays = distinctDates.size;
    const avgPerDay = activeDays > 0 ? totalActivities / activeDays : 0;

    const categoryTotals: Record<string, number> = {};
    for (const a of filtered) {
      categoryTotals[a.category] = (categoryTotals[a.category] || 0) + a.activity_count;
    }
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    return { totalActivities, activeDays, avgPerDay, topCategory };
  }, [filtered]);

  // Weekly data
  const weeklyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of filtered) {
      const date = parseISO(a.activity_date);
      const week = getISOWeek(date);
      const year = getISOWeekYear(date);
      const key = `${year}-${String(week).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + a.activity_count;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count], i) => ({
        week: `S${key.split('-')[1]}`,
        count,
      }));
  }, [filtered]);

  // Hourly average data
  const hourlyAvgData = useMemo(() => {
    const hourSum: Record<number, number> = {};
    const hourDays: Record<number, Set<string>> = {};
    for (let h = 0; h < 24; h++) {
      hourSum[h] = 0;
      hourDays[h] = new Set();
    }
    for (const a of filtered) {
      hourSum[a.activity_hour] += a.activity_count;
      hourDays[a.activity_hour].add(a.activity_date);
    }
    return Array.from({ length: 24 }, (_, h) => ({
      hour: String(h).padStart(2, '0') + 'h',
      avg: hourDays[h].size > 0 ? Math.round((hourSum[h] / hourDays[h].size) * 100) / 100 : 0,
    }));
  }, [filtered]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of filtered) {
      map[a.category] = (map[a.category] || 0) + a.activity_count;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* User selector */}
      <div>
        <select
          className="w-full max-w-xs px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">Selecione um usuário</option>
          {userNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {!selectedUser ? (
        <p className="text-muted-foreground text-sm">Selecione um usuário para ver o detalhamento</p>
      ) : (
        <>
          {/* KPI row */}
          {kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-glass p-4 rounded-xl text-center">
                <p className="text-muted-foreground text-xs mb-1">Total Atividades</p>
                <p className="text-2xl font-bold text-foreground">{kpis.totalActivities.toLocaleString('pt-BR')}</p>
              </div>
              <div className="card-glass p-4 rounded-xl text-center">
                <p className="text-muted-foreground text-xs mb-1">Dias Ativos</p>
                <p className="text-2xl font-bold text-foreground">{kpis.activeDays}</p>
              </div>
              <div className="card-glass p-4 rounded-xl text-center">
                <p className="text-muted-foreground text-xs mb-1">Média por Dia</p>
                <p className="text-2xl font-bold text-foreground">{kpis.avgPerDay.toFixed(1)}</p>
              </div>
              <div className="card-glass p-4 rounded-xl text-center">
                <p className="text-muted-foreground text-xs mb-1">Categoria Principal</p>
                <p className="text-lg font-bold text-foreground">{kpis.topCategory}</p>
              </div>
            </div>
          )}

          {/* Weekly chart */}
          <div className="card-glass p-4 rounded-xl">
            <h3 className="text-base font-semibold text-foreground mb-4">Atividades por Semana</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="week" stroke="hsl(240, 5%, 65%)" tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }} />
                <YAxis stroke="hsl(240, 5%, 65%)" />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="hsl(263, 70%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly average chart */}
          <div className="card-glass p-4 rounded-xl">
            <h3 className="text-base font-semibold text-foreground mb-4">Média de Atividades por Hora</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyAvgData}>
                <XAxis dataKey="hour" stroke="hsl(240, 5%, 65%)" tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 11 }} />
                <YAxis stroke="hsl(240, 5%, 65%)" />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="avg" fill="hsl(270, 50%, 70%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown */}
          <div className="card-glass p-4 rounded-xl">
            <h3 className="text-base font-semibold text-foreground mb-4">Breakdown por Categoria</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, categoryData.length * 40)}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" stroke="hsl(240, 5%, 65%)" />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="hsl(240, 5%, 65%)"
                  tick={{ fill: 'hsl(240, 5%, 65%)', fontSize: 12 }}
                  width={140}
                />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || 'hsl(240, 5%, 50%)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
