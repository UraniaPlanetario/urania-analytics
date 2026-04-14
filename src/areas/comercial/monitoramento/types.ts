export interface UserActivity {
  user_id: number;
  user_name: string;
  activity_date: string;
  activity_hour: number;
  event_type: string;
  category: string;
  entity_type: string | null;
  activity_count: number;
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Mensagem': 'hsl(263, 70%, 58%)',      // purple
  'Tarefa': 'hsl(270, 50%, 70%)',        // lilac
  'Nota': 'hsl(45, 80%, 55%)',           // gold
  'Movimentação': 'hsl(142, 60%, 50%)',  // green
  'Campo alterado': 'hsl(200, 70%, 55%)',// blue
  'Tag': 'hsl(320, 60%, 55%)',           // pink
  'Conversa': 'hsl(180, 60%, 50%)',      // cyan
  'Ligação': 'hsl(15, 80%, 55%)',        // orange
  'E-mail': 'hsl(0, 72%, 51%)',          // red
  'Vinculação': 'hsl(240, 40%, 60%)',    // indigo
  'Outros': 'hsl(240, 5%, 50%)',         // gray
};

export interface MonitoringFilters {
  users: string[];
  categories: string[];
  dateRange: { from: Date | null; to: Date | null };
}
