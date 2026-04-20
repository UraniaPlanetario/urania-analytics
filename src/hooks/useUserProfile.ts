import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  nome: string | null;
  roles: string[];
}

export function useUserProfile() {
  return useQuery<UserProfile | null>({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return { id: user.id, email: user.email || '', nome: null, roles: [] };
      }
      return data as UserProfile;
    },
    staleTime: 10 * 60 * 1000,
  });
}
