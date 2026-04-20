import { SDR } from '../types';

export const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: 'hsl(240, 10%, 10%)', border: 'none', borderRadius: 8 },
  itemStyle: { color: '#fff' },
};

export const COLORS = {
  purple: 'hsl(263, 70%, 58%)',
  lilac: 'hsl(270, 50%, 70%)',
  gold: 'hsl(45, 80%, 55%)',
  green: 'hsl(142, 60%, 50%)',
  red: 'hsl(0, 72%, 51%)',
  yellow: 'hsl(45, 93%, 47%)',
  muted: 'hsl(240, 5%, 65%)',
};

// Paleta consistente para séries (SDRs, faixas, etc)
export const SERIES_COLORS = [
  'hsl(263, 70%, 58%)',
  'hsl(270, 50%, 70%)',
  'hsl(45, 80%, 55%)',
  'hsl(142, 60%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(45, 93%, 47%)',
  'hsl(200, 70%, 55%)',
  'hsl(320, 60%, 60%)',
];

// Filtra SDRs ativos no período (vigência cobre o período)
export function getActiveSdrs(sdrs: SDR[], from: Date, to: Date): SDR[] {
  return sdrs.filter((s) => {
    const inicio = new Date(s.vigencia_inicio);
    const fim = s.vigencia_fim ? new Date(s.vigencia_fim) : new Date('9999-12-31');
    return inicio <= to && fim >= from;
  });
}

// Conta dias úteis entre duas datas (inclusive)
export function countWeekdays(from: Date, to: Date): number {
  let count = 0;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// Filtra itens para apenas SDRs (cruzamento por nome)
export function filterToSDRs<T>(
  items: T[],
  sdrNames: Set<string>,
  getName: (item: T) => string | null | undefined,
): T[] {
  return items.filter((item) => {
    const name = getName(item);
    return !!name && sdrNames.has(name);
  });
}

// Retorna YYYY-MM-DD de uma Date (local time)
export function toLocalDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Retorna chave de semana ISO (YYYY-Www)
export function toWeekKey(d: Date): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday of the current week decides the year
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Gera labels de datas entre from e to (YYYY-MM-DD)
export function datesBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    out.push(toLocalDateKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Formata curto para dia (dd/MM)
export function shortDay(key: string): string {
  const [, mm, dd] = key.split('-');
  return `${dd}/${mm}`;
}
