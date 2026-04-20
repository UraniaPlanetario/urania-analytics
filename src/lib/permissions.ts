// Sistema de permissões por área/dashboard

export type Role =
  | 'admin'
  | 'super_viewer'
  | 'viewer_qualidade_comercial'
  | 'gestor_onboarding'
  // Roles individuais (futuro)
  | 'viewer_sdr'
  | 'viewer_consultor';

export interface Permission {
  path: string;
  label: string;
  roles: Role[];
}

// Mapa: path → roles que podem acessar
export const PERMISSIONS: Permission[] = [
  // Comercial > Qualidade Comercial
  { path: '/comercial/qualidade', label: 'Qualidade', roles: ['admin', 'super_viewer', 'viewer_qualidade_comercial'] },
  { path: '/comercial/monitoramento', label: 'Monitoramento Usuários', roles: ['admin', 'super_viewer', 'viewer_qualidade_comercial'] },
  // Comercial > demais
  { path: '/comercial/leads-fechados', label: 'Leads Fechados', roles: ['admin', 'super_viewer'] },
  { path: '/comercial/campanhas', label: 'Campanhas Semanais', roles: ['admin', 'super_viewer'] },
  { path: '/comercial/desempenho-vendedor', label: 'Desempenho Vendedor', roles: ['admin', 'super_viewer'] },
  { path: '/comercial/desempenho-sdr', label: 'Desempenho SDR', roles: ['admin', 'super_viewer'] },
  // Outras áreas
  { path: '/marketing', label: 'Marketing', roles: ['admin', 'super_viewer'] },
  { path: '/financeiro', label: 'Financeiro', roles: ['admin', 'super_viewer'] },
  { path: '/onboarding', label: 'Onboarding', roles: ['admin', 'super_viewer', 'gestor_onboarding'] },
  { path: '/tecnologia', label: 'Tecnologia', roles: ['admin', 'super_viewer'] },
  // Admin
  { path: '/admin/usuarios', label: 'Gerenciar Usuários', roles: ['admin'] },
];

export function hasAccess(userRoles: string[], path: string): boolean {
  const perm = PERMISSIONS.find((p) => p.path === path);
  if (!perm) return true; // sem regra explícita = liberado
  return userRoles.some((r) => perm.roles.includes(r as Role));
}

export function getAccessiblePaths(userRoles: string[]): string[] {
  return PERMISSIONS.filter((p) => userRoles.some((r) => p.roles.includes(r as Role))).map((p) => p.path);
}

export function isAdmin(userRoles: string[]): boolean {
  return userRoles.includes('admin');
}
