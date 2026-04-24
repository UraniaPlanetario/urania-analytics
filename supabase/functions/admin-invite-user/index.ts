import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch { return null; }
}

async function verifyBIAdmin(supabase: any, token: string) {
  const payload = decodeJwtPayload(token);
  if (payload?.role === 'service_role') return { id: 'service_role', email: 'service_role' };
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('users')
    .select('id, email, is_global_admin, is_active')
    .eq('auth_user_id', user.id).maybeSingle();
  if (!data?.is_active || !data?.is_global_admin) return null;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization header ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const sessionToken = authHeader.slice(7);

    const { email, mode } = await req.json(); // mode: 'invite' | 'recovery'
    if (!email) {
      return new Response(JSON.stringify({ error: 'email obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const admin = await verifyBIAdmin(supa, sessionToken);
    if (!admin) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas admins globais.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Busca o user no public.users
    const { data: biUser } = await supa.from('users')
      .select('id, email, full_name, auth_user_id').eq('email', email).maybeSingle();

    if (!biUser) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado no BI' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://urania-analytics.vercel.app';
    const redirectTo = `${siteUrl}/reset-password`;

    // Decide modo: se não tem auth_user_id ou mode='invite', manda convite; senão recovery
    const shouldInvite = !biUser.auth_user_id || mode === 'invite';

    let result: any;
    if (shouldInvite) {
      // Cria em auth.users + envia email de convite
      const { data, error } = await supa.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (error) {
        // Se já existe em auth.users, faz recovery em vez
        if (error.message?.includes('already') || error.status === 422) {
          const { data: rec, error: recErr } = await supa.auth.admin.generateLink({
            type: 'recovery', email, options: { redirectTo },
          });
          if (recErr) throw recErr;
          result = { mode: 'recovery', action_link: rec.properties?.action_link };
        } else {
          throw error;
        }
      } else {
        result = { mode: 'invite', user_id: data.user?.id };
        // Linka auth_user_id em public.users
        if (data.user?.id && !biUser.auth_user_id) {
          await supa.from('users').update({ auth_user_id: data.user.id }).eq('id', biUser.id);
        }
      }
    } else {
      // User já tem login — só manda redefinição de senha
      const { data, error } = await supa.auth.admin.generateLink({
        type: 'recovery', email, options: { redirectTo },
      });
      if (error) throw error;
      result = { mode: 'recovery', action_link: data.properties?.action_link };
    }

    return new Response(JSON.stringify({ success: true, email, ...result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Unexpected:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
