/**
 * useRouteAccess — BI Urânia
 * ─────────────────────────────────────────────────────────────────────────────
 * Avalia `route_access_policies` + `route_access_rules` (platform_id = BI) para a rota atual.
 *
 * Regras avaliadas (OR — qualquer match libera):
 *   1. global_admin     → user.is_global_admin = true
 *   2. platform_admin   → user_platform_access admin/manager na platform_id da rule
 *   3. department_role  → user_departments com dept + role >= min_role
 *   4. specific_user    → user_id bate exatamente
 *
 * Sem policy registrada = rota liberada (restrição é opt-in).
 */

import { useMemo } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useBIRole } from '@/hooks/useBIRole';
import { useDepartmentAccess } from '@/hooks/useDepartmentAccess';
import { BI_PLATFORM_ID } from '@/lib/roles';

const DEPT_ROLE_HIERARCHY: Record<string, number> = {
  member: 0,
  leader: 1,
};

interface RouteAccessRule {
  id: number;
  rule_type: 'global_admin' | 'platform_admin' | 'department_role' | 'entity_participant' | 'specific_user';
  platform_id: number | null;
  department_id: number | null;
  min_role: string | null;
  user_id: string | null;
  is_system: boolean;
}

interface RouteAccessPolicy {
  id: number;
  platform_id: number;
  route: string;
  label: string;
  managed_by: string;
  rules: RouteAccessRule[];
}

export interface UseRouteAccessOptions {
  route?: string;
}

export interface UseRouteAccessResult {
  canAccess: boolean;
  isLoading: boolean;
  isGlobalAdmin: boolean;
  policy: RouteAccessPolicy | null;
}

export function useRouteAccess(options: UseRouteAccessOptions = {}): UseRouteAccessResult {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin: isBIAdmin, isLoading: roleLoading } = useBIRole();
  const { canAccessRoute: deptCanAccess, isRestricted: isDeptRestricted, isLoading: deptLoading } = useDepartmentAccess();
  const location = useLocation();
  const currentPath = options.route ?? location.pathname;

  const isGlobalAdmin = user?.is_global_admin ?? false;

  const { data: policies = [], isLoading: policiesLoading } = useQuery<RouteAccessPolicy[]>({
    queryKey: ['route-access-policies', BI_PLATFORM_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('route_access_policies')
        .select(`
          id, platform_id, route, label, managed_by,
          rules:route_access_rules (
            id, rule_type, platform_id, department_id, min_role, user_id, is_system
          )
        `)
        .eq('platform_id', BI_PLATFORM_ID);

      if (error) throw new Error(`Erro ao buscar policies: ${error.message}`);
      return (data ?? []) as RouteAccessPolicy[];
    },
    staleTime: 60_000,
    enabled: !!user?.id && !isBIAdmin && !roleLoading,
  });

  const matchedPolicy = useMemo(() => {
    for (const policy of policies) {
      if (matchPath(policy.route, currentPath)) return policy;
    }
    return null;
  }, [policies, currentPath]);

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['route-access-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [platformAccess, departments] = await Promise.all([
        supabase
          .from('user_platform_access')
          .select('platform_id, role')
          .eq('user_id', user.id)
          .then((r) => r.data ?? []),
        supabase
          .from('user_departments')
          .select('department_id, role')
          .eq('user_id', user.id)
          .then((r) => r.data ?? []),
      ]);

      return {
        platformAccess: platformAccess as { platform_id: number; role: string }[],
        departments: departments as { department_id: number; role: string }[],
      };
    },
    staleTime: 30_000,
    enabled: !!user?.id && !isBIAdmin && !roleLoading && !!matchedPolicy,
  });

  const canAccess = useMemo(() => {
    if (isBIAdmin) return true;

    if (isDeptRestricted && !deptCanAccess(currentPath)) return false;

    if (!matchedPolicy) return true;
    if (!userProfile) return false;

    for (const rule of matchedPolicy.rules) {
      switch (rule.rule_type) {
        case 'global_admin':
          if (isGlobalAdmin) return true;
          break;
        case 'platform_admin': {
          const hit = userProfile.platformAccess.some(
            (pa) => pa.platform_id === rule.platform_id && ['admin', 'manager'].includes(pa.role)
          );
          if (hit) return true;
          break;
        }
        case 'department_role': {
          if (rule.department_id == null || rule.min_role == null) break;
          const minLevel = DEPT_ROLE_HIERARCHY[rule.min_role] ?? 0;
          const hit = userProfile.departments.some(
            (d) =>
              d.department_id === rule.department_id &&
              (DEPT_ROLE_HIERARCHY[d.role] ?? -1) >= minLevel
          );
          if (hit) return true;
          break;
        }
        case 'specific_user':
          if (rule.user_id === user?.id) return true;
          break;
      }
    }
    return false;
  }, [matchedPolicy, userProfile, isBIAdmin, isDeptRestricted, deptCanAccess, currentPath, isGlobalAdmin, user?.id]);

  const isLoading =
    authLoading ||
    roleLoading ||
    deptLoading ||
    policiesLoading ||
    (!!matchedPolicy && profileLoading);

  return {
    canAccess: isLoading ? true : canAccess,
    isLoading,
    isGlobalAdmin,
    policy: matchedPolicy,
  };
}
