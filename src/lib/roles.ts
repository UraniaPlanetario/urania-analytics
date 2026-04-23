// Hierarquia de roles da plataforma BI
// Fonte de verdade: user_platform_access.role WHERE platform_id = 1
// (seed em supabase/migrations/017_rbac_schema.sql)

export type BIRole = 'viewer' | 'user' | 'manager' | 'admin';

export const BI_ROLE_HIERARCHY: Record<BIRole, number> = {
  viewer: 0,
  user: 1,
  manager: 2,
  admin: 3,
} as const;

export const BI_ROLE_LABELS: Record<BIRole, string> = {
  viewer: 'Visualizador',
  user: 'Usuário',
  manager: 'Gestão',
  admin: 'Administrador',
} as const;

/** Retorna true se `current` tem pelo menos o nível de `min` */
export function hasMinRole(current: BIRole | null | undefined, min: BIRole): boolean {
  if (!current) return false;
  return (BI_ROLE_HIERARCHY[current] ?? -1) >= (BI_ROLE_HIERARCHY[min] ?? 99);
}

/** ID da plataforma BI no banco (public.platforms.id) */
export const BI_PLATFORM_ID = 1;
