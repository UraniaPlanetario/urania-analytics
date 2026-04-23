import { supabase, type User } from './supabase';
import { BI_PLATFORM_ID } from './roles';

const CURRENT_USER_KEY = 'biCurrentUser';

async function fetchUserProfile(authUserId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error || !data) return null;
  return data as User;
}

export async function login(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Email ou senha incorretos');
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Email não confirmado. Verifique sua caixa de entrada.');
    }
    throw new Error(error.message || 'Erro ao realizar login');
  }

  if (!data.user) throw new Error('Erro ao realizar login');

  const profile = await fetchUserProfile(data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('Usuário não provisionado no BI. Contate o administrador.');
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    throw new Error('Usuário inativo. Entre em contato com o administrador.');
  }

  // Admin global bypassa check de plataforma
  if (!profile.is_global_admin) {
    const { data: biAccess } = await supabase
      .from('user_platform_access')
      .select('id')
      .eq('user_id', profile.id)
      .eq('platform_id', BI_PLATFORM_ID)
      .limit(1);

    if (!biAccess || biAccess.length === 0) {
      await supabase.auth.signOut();
      throw new Error('Você não possui acesso ao BI Urânia. Contate o administrador.');
    }
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
  return profile;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser(): User | null {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

export async function checkSession(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }

  const profile = await fetchUserProfile(session.user.id);
  if (!profile) return getCurrentUser();

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
  return profile;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error('Erro ao alterar senha');
}

export function updateUserCache(user: User): void {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function clearUserCache(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}
