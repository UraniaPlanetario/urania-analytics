import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wkunbifgxntzbufjkize.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__i87LpO2WUcJxXfscAshmw_klwhv9r4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Types espelhando a tabela public.users (sincronizada com o Hub) ──────
// IMPORTANTE: `id` é o UUID vindo do Hub. O vínculo com auth.users local é via `auth_user_id`.
export interface NotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  teams: boolean;
}

export interface User {
  id: string;             // UUID vindo do Hub
  auth_user_id: string | null; // UUID local em auth.users (null = shadow user)
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  is_active: boolean;
  is_global_admin: boolean;
  kommo_user_id: number | null;
  teams_user_id: string | null;
  phone_whatsapp: string | null;
  notification_preferences: NotificationPreferences | null;
  synced_from_hub_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Department {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  parent_department_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserDepartment {
  id: number;
  name: string;
  color: string;
  role: 'member' | 'leader';
}

export interface Platform {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  base_url: string | null;
  is_active: boolean;
  display_order: number;
}

export interface UserPlatformAccess {
  id: number;
  user_id: string;
  platform_id: number;
  role: string;
  permissions: Record<string, unknown>;
  created_at: string;
}
