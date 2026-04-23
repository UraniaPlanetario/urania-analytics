import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { BIRole, BI_PLATFORM_ID, hasMinRole } from '@/lib/roles';

export interface UseBIRoleResult {
  biRole: BIRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
}

/**
 * Role do usuário logado na plataforma BI (platform_id = 1).
 * is_global_admin = admin implícito.
 */
export function useBIRole(): UseBIRoleResult {
  const { user, loading: authLoading } = useAuth();

  const { data: biRole = null, isLoading: roleLoading } = useQuery<BIRole | null>({
    queryKey: ['bi-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      if (user.is_global_admin) return 'admin';

      const { data, error } = await supabase
        .from('user_platform_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('platform_id', BI_PLATFORM_ID)
        .maybeSingle();

      if (error || !data) return null;
      return (data.role as BIRole) ?? null;
    },
    staleTime: 30_000,
    enabled: !!user?.id && !authLoading,
  });

  const isLoading = authLoading || roleLoading;

  return {
    biRole,
    isLoading,
    isAdmin: hasMinRole(biRole, 'admin'),
    isManager: hasMinRole(biRole, 'manager'),
  };
}
