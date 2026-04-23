import { useState, useEffect, useCallback } from 'react';
import { supabase, type User } from '@/lib/supabase';
import {
  login as authLogin,
  logout as authLogout,
  checkSession,
  updatePassword as authUpdatePassword,
  getCurrentUser,
  updateUserCache,
  clearUserCache,
} from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession().then((sessionUser) => {
      setUser((prev) => {
        if (!sessionUser) return null;
        if (prev?.id === sessionUser.id && prev?.updated_at === sessionUser.updated_at) return prev;
        return sessionUser;
      });
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setTimeout(() => {
          supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data) {
                updateUserCache(data as User);
                setUser((prev) => {
                  const next = data as User;
                  if (prev?.id === next.id && prev?.updated_at === next.updated_at) return prev;
                  return next;
                });
              }
            });
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        clearUserCache();
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const loggedUser = await authLogin(email, password);
    setUser(loggedUser);
  }, []);

  const signOut = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    await authUpdatePassword(newPassword);
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isActive: user?.is_active ?? false,
    isGlobalAdmin: user?.is_global_admin ?? false,
    signIn,
    signOut,
    changePassword,
  };
}
