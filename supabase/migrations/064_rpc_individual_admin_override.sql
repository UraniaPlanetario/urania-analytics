-- Modo "Visualizar como vendedor" — admins podem passar override pras
-- RPCs do dashboard individual pra simular a visão de outro vendedor
-- (sem precisar logar como ele). Vendedor comum não tem effect: o
-- parâmetro é ignorado pra quem não é admin.

-- Helper: confere se o caller atual é global admin
CREATE OR REPLACE FUNCTION gold._is_global_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT u.is_global_admin FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1),
    FALSE
  );
$$;
GRANT EXECUTE ON FUNCTION gold._is_global_admin() TO anon, authenticated;

-- 1. get_meu_vendedor_consultor(override)
CREATE OR REPLACE FUNCTION gold.get_meu_vendedor_consultor(p_override TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold'
AS $$
DECLARE
  v TEXT;
BEGIN
  IF p_override IS NOT NULL AND gold._is_global_admin() THEN
    RETURN p_override;
  END IF;
  SELECT u.vendedor_consultor INTO v FROM public.users u
  WHERE u.auth_user_id = auth.uid() AND u.vendedor_consultor IS NOT NULL LIMIT 1;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION gold.get_meu_vendedor_consultor(TEXT) TO anon, authenticated;

-- 2. get_meu_kommo_user_id(override)
CREATE OR REPLACE FUNCTION gold.get_meu_kommo_user_id(p_override BIGINT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold'
AS $$
DECLARE
  v BIGINT;
BEGIN
  IF p_override IS NOT NULL AND gold._is_global_admin() THEN
    RETURN p_override;
  END IF;
  SELECT u.kommo_user_id INTO v FROM public.users u
  WHERE u.auth_user_id = auth.uid() AND u.kommo_user_id IS NOT NULL LIMIT 1;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION gold.get_meu_kommo_user_id(BIGINT) TO anon, authenticated;

-- 3. get_meus_leads_fechados(override)
CREATE OR REPLACE FUNCTION gold.get_meus_leads_fechados(p_vendedor_override TEXT DEFAULT NULL)
RETURNS TABLE (
  lead_id bigint, lead_name text, vendedor text,
  data_fechamento_fmt date, data_agendamento_fmt timestamptz, data_cancelamento_fmt date,
  cancelado boolean, pipeline_onboarding text, pipeline_atual text, status_atual text,
  lead_price numeric, n_diarias text, occurrence int, lead_created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold', 'bronze'
AS $$
DECLARE
  v_vendedor TEXT;
BEGIN
  IF p_vendedor_override IS NOT NULL AND gold._is_global_admin() THEN
    v_vendedor := p_vendedor_override;
  ELSE
    SELECT u.vendedor_consultor INTO v_vendedor FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.vendedor_consultor IS NOT NULL LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT lc.lead_id, lc.lead_name, lc.vendedor,
    lc.data_fechamento_fmt, lc.data_agendamento_fmt, lc.data_cancelamento_fmt,
    lc.cancelado, lc.pipeline_onboarding,
    l.pipeline_name, l.status_name,
    lc.lead_price, lc.n_diarias, lc.occurrence, lc.lead_created_at
  FROM gold.leads_closed lc
  LEFT JOIN bronze.kommo_leads_raw l ON l.id = lc.lead_id
  WHERE lc.vendedor = v_vendedor;
END;
$$;
GRANT EXECUTE ON FUNCTION gold.get_meus_leads_fechados(TEXT) TO anon, authenticated;

-- 4. get_meus_leads_funil(override)
CREATE OR REPLACE FUNCTION gold.get_meus_leads_funil(p_kommo_user_id_override BIGINT DEFAULT NULL)
RETURNS SETOF gold.funil_whats_leads_atual
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold'
AS $$
DECLARE
  v_kommo_id BIGINT;
BEGIN
  IF p_kommo_user_id_override IS NOT NULL AND gold._is_global_admin() THEN
    v_kommo_id := p_kommo_user_id_override;
  ELSE
    SELECT u.kommo_user_id INTO v_kommo_id FROM public.users u
    WHERE u.auth_user_id = auth.uid() AND u.kommo_user_id IS NOT NULL LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT * FROM gold.funil_whats_leads_atual WHERE responsible_user_id = v_kommo_id;
END;
$$;
GRANT EXECUTE ON FUNCTION gold.get_meus_leads_funil(BIGINT) TO anon, authenticated;

-- 5. Lista de vendedores pro select de impersonar (admin)
CREATE OR REPLACE FUNCTION gold.lista_vendedores_pra_impersonar()
RETURNS TABLE (vendedor TEXT, kommo_user_id BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold', 'bronze'
AS $$
  WITH vendedores AS (
    SELECT DISTINCT vendedor FROM gold.leads_closed WHERE vendedor IS NOT NULL
  ),
  kommo_users AS (
    SELECT id, name FROM bronze.kommo_users WHERE COALESCE(is_active, true) = true
  )
  SELECT v.vendedor::TEXT, ku.id::BIGINT AS kommo_user_id
  FROM vendedores v
  LEFT JOIN kommo_users ku ON ku.name = v.vendedor
  ORDER BY v.vendedor;
$$;
GRANT EXECUTE ON FUNCTION gold.lista_vendedores_pra_impersonar() TO anon, authenticated;
