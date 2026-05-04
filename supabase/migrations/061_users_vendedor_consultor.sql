-- Adiciona campo vendedor_consultor em public.users — texto exato do custom
-- field "Vendedor/Consultor" do Kommo. Mapeamento manual via /admin/usuarios,
-- mesmo padrão do users.astronomo. Permite o vendedor logado ver no
-- /individual/vendedor apenas os leads dele (gold.leads_closed.vendedor = users.vendedor_consultor).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS vendedor_consultor TEXT;

CREATE INDEX IF NOT EXISTS idx_users_vendedor_consultor
  ON public.users(vendedor_consultor)
  WHERE vendedor_consultor IS NOT NULL;

COMMENT ON COLUMN public.users.vendedor_consultor IS
  'Nome exato no custom field "Vendedor/Consultor" do Kommo (texto livre). Cruzado com gold.leads_closed.vendedor pra individualizar dashboards do vendedor logado.';

-- RPC: vendedor_consultor do user logado (NULL se não mapeado)
CREATE OR REPLACE FUNCTION gold.get_meu_vendedor_consultor()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold'
AS $$
  SELECT u.vendedor_consultor
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.vendedor_consultor IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION gold.get_meu_vendedor_consultor() TO anon, authenticated;

-- RPC: kommo_user_id do user logado (NULL se não mapeado) — pra Auditoria
-- de Funil que cruza com lead.responsible_user_id
CREATE OR REPLACE FUNCTION gold.get_meu_kommo_user_id()
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold'
AS $$
  SELECT u.kommo_user_id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.kommo_user_id IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION gold.get_meu_kommo_user_id() TO anon, authenticated;
