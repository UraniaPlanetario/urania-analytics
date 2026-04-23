import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BI_PLATFORM_ID = 1;

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

async function verifyBIAdmin(supabase: any, token: string) {
  const payload = decodeJwtPayload(token);
  if (payload?.role === 'service_role') {
    return { id: 'service_role', email: 'service_role', is_global_admin: true };
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('id, email, is_global_admin, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!userData?.is_active) return null;
  if (userData.is_global_admin) return userData;

  // Admin/manager na plataforma BI também pode sincronizar
  const { data: biAccess } = await supabase
    .from('user_platform_access')
    .select('role')
    .eq('user_id', userData.id)
    .eq('platform_id', BI_PLATFORM_ID)
    .maybeSingle();

  if (biAccess?.role === 'admin' || biAccess?.role === 'manager') return userData;

  return null;
}

interface KommoUser {
  id: number;
  name: string;
  email: string;
}

interface SyncResult {
  kommoEmail: string;
  kommoName: string;
  kommoId: number;
  biEmail: string;
  biName: string | null;
  action: 'mapped' | 'overwritten' | 'unchanged';
  previousKommoId?: number | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const sessionToken = authHeader.slice(7);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const adminUser = await verifyBIAdmin(supabaseAdmin, sessionToken);
    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas admins/managers podem sincronizar.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const kommoToken = Deno.env.get('KOMMO_ACCESS_TOKEN');
    const kommoBaseUrl = Deno.env.get('KOMMO_BASE_URL');
    if (!kommoToken || !kommoBaseUrl) {
      return new Response(
        JSON.stringify({ error: 'KOMMO_ACCESS_TOKEN ou KOMMO_BASE_URL não configurados.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Buscar todos os usuários do Kommo
    const kommoResp = await fetch(`${kommoBaseUrl}/api/v4/users?limit=250`, {
      headers: { Authorization: `Bearer ${kommoToken}` },
    });

    if (!kommoResp.ok) {
      const errText = await kommoResp.text();
      return new Response(
        JSON.stringify({ error: `Erro Kommo: ${kommoResp.status} ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const kommoData = await kommoResp.json();
    const kommoUsers: KommoUser[] = (kommoData._embedded?.users || []).map((u: any) => ({
      id: u.id,
      name: u.name || '',
      email: (u.email || '').toLowerCase().trim(),
    }));

    // Usuários do BI (users)
    const { data: biUsers, error: biError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, kommo_user_id')
      .eq('is_active', true);

    if (biError) {
      return new Response(
        JSON.stringify({ error: `Erro BI: ${biError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const biByEmail = new Map<string, typeof biUsers[0]>();
    for (const bu of biUsers || []) {
      biByEmail.set(bu.email.toLowerCase().trim(), bu);
    }

    const results: SyncResult[] = [];
    const notFoundInBI: Array<{ kommoId: number; name: string; email: string }> = [];

    for (const ku of kommoUsers) {
      if (!ku.email) continue;
      const biUser = biByEmail.get(ku.email);
      if (!biUser) {
        notFoundInBI.push({ kommoId: ku.id, name: ku.name, email: ku.email });
        continue;
      }

      const previousKommoId = biUser.kommo_user_id;
      if (previousKommoId === ku.id) {
        results.push({
          kommoEmail: ku.email, kommoName: ku.name, kommoId: ku.id,
          biEmail: biUser.email, biName: biUser.full_name,
          action: 'unchanged',
        });
        continue;
      }

      await supabaseAdmin
        .from('users')
        .update({ kommo_user_id: ku.id, updated_at: new Date().toISOString() })
        .eq('id', biUser.id);

      results.push({
        kommoEmail: ku.email, kommoName: ku.name, kommoId: ku.id,
        biEmail: biUser.email, biName: biUser.full_name,
        action: previousKommoId ? 'overwritten' : 'mapped',
        previousKommoId,
      });
    }

    const matchedEmails = new Set(kommoUsers.map((k) => k.email));
    const notFoundInKommo = (biUsers || [])
      .filter((bu) => !matchedEmails.has(bu.email.toLowerCase().trim()))
      .map((bu) => ({ biName: bu.full_name, email: bu.email }));

    const mapped = results.filter((r) => r.action === 'mapped');
    const overwritten = results.filter((r) => r.action === 'overwritten');
    const unchanged = results.filter((r) => r.action === 'unchanged');

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          kommo_total: kommoUsers.length,
          bi_total: biUsers?.length || 0,
          mapped: mapped.length,
          overwritten: overwritten.length,
          unchanged: unchanged.length,
          not_found_in_bi: notFoundInBI.length,
          not_found_in_kommo: notFoundInKommo.length,
        },
        mapped,
        overwritten,
        notFoundInBI,
        notFoundInKommo,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: `Erro interno: ${error instanceof Error ? error.message : String(error)}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
