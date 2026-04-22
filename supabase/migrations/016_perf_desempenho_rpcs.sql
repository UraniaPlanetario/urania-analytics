-- ============================================================================
-- Fase 1 de perf para Desempenho SDR + Vendedor — RPCs agregadas
-- Reduz pagina ção de 69k/40k/34k rows para chamadas <1s de ~20-200 rows
-- ============================================================================

-- 1) Alterações de campo — resumo por usuário no período
-- Dados: total, dias_com_alt, leads_distintos (whitelist já aplicada na view)
CREATE OR REPLACE FUNCTION gold.alteracoes_resumo_por_user(
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE(
  user_id bigint,
  user_name text,
  total bigint,
  dias_com_alt bigint,
  leads_distintos bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    criado_por_id AS user_id,
    criado_por AS user_name,
    COUNT(*)::bigint AS total,
    COUNT(DISTINCT data_criacao::date)::bigint AS dias_com_alt,
    COUNT(DISTINCT lead_id)::bigint AS leads_distintos
  FROM gold.alteracoes_humanas
  WHERE data_criacao >= p_from
    AND data_criacao <= p_to
    AND dentro_janela = true
    AND criado_por_id IS NOT NULL
  GROUP BY criado_por_id, criado_por;
$$;
GRANT EXECUTE ON FUNCTION gold.alteracoes_resumo_por_user(timestamptz, timestamptz)
  TO anon, authenticated, service_role;

-- 2) Alterações por usuário e dia — para charts diários/semanais
CREATE OR REPLACE FUNCTION gold.alteracoes_diaria_por_user(
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE(
  user_id bigint,
  user_name text,
  dia date,
  total bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    criado_por_id AS user_id,
    criado_por AS user_name,
    (data_criacao AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
    COUNT(*)::bigint AS total
  FROM gold.alteracoes_humanas
  WHERE data_criacao >= p_from
    AND data_criacao <= p_to
    AND dentro_janela = true
    AND criado_por_id IS NOT NULL
  GROUP BY criado_por_id, criado_por, dia;
$$;
GRANT EXECUTE ON FUNCTION gold.alteracoes_diaria_por_user(timestamptz, timestamptz)
  TO anon, authenticated, service_role;

-- 3) Alterações mensal por usuário — para chart mensal do BlocoCamposAlterados (Vendedor)
CREATE OR REPLACE FUNCTION gold.alteracoes_mensal_por_user(
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE(
  user_id bigint,
  user_name text,
  mes_key text,
  total bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    criado_por_id AS user_id,
    criado_por AS user_name,
    to_char(data_criacao AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS mes_key,
    COUNT(*)::bigint AS total
  FROM gold.alteracoes_humanas
  WHERE data_criacao >= p_from
    AND data_criacao <= p_to
    AND dentro_janela = true
    AND criado_por_id IS NOT NULL
  GROUP BY criado_por_id, criado_por, mes_key;
$$;
GRANT EXECUTE ON FUNCTION gold.alteracoes_mensal_por_user(timestamptz, timestamptz)
  TO anon, authenticated, service_role;

-- 4) Tempo resposta por usuário x faixa — para Bloco2TempoResposta e BlocoTempoResposta
CREATE OR REPLACE FUNCTION gold.tempo_resposta_por_user_faixa(
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE(
  user_id bigint,
  user_name text,
  faixa text,
  count bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    responder_user_id AS user_id,
    responder_user_name AS user_name,
    faixa,
    COUNT(*)::bigint
  FROM gold.tempo_resposta_mensagens
  WHERE recebida_dentro_janela = true
    AND received_at >= p_from
    AND received_at <= p_to
    AND responder_user_id IS NOT NULL
  GROUP BY responder_user_id, responder_user_name, faixa;
$$;
GRANT EXECUTE ON FUNCTION gold.tempo_resposta_por_user_faixa(timestamptz, timestamptz)
  TO anon, authenticated, service_role;

-- 5) Qualificação (Bloco5 do SDR) — recebidos_time + qualificados por SDR
-- Qualificação = pipeline Recepção → Vendas OU status_to_id = 100952455 ("Qualificado SDR" /
-- "Lead Pré-Qualificado (SDR)" quando renomeado)
CREATE OR REPLACE FUNCTION gold.movimentos_qualificacao_resumo(
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE(
  kind text,
  user_id bigint,
  user_name text,
  leads bigint
) LANGUAGE sql STABLE AS $$
  WITH periodo AS (
    SELECT * FROM gold.leads_movements
    WHERE moved_at >= p_from AND moved_at <= p_to
  ),
  recebidos AS (
    SELECT COUNT(DISTINCT lead_id)::bigint AS total
    FROM periodo
    WHERE pipeline_to = 'Recepção Leads Insta'
  ),
  qualificacao AS (
    SELECT DISTINCT moved_by_id, moved_by, lead_id
    FROM periodo
    WHERE (pipeline_from = 'Recepção Leads Insta' AND pipeline_to = 'Vendas WhatsApp')
       OR status_to_id = 100952455
  )
  SELECT 'recebidos_time'::text AS kind, NULL::bigint AS user_id, NULL::text AS user_name, total AS leads
  FROM recebidos
  UNION ALL
  SELECT 'qualificados_user'::text, moved_by_id, moved_by, COUNT(DISTINCT lead_id)::bigint
  FROM qualificacao
  WHERE moved_by_id IS NOT NULL
  GROUP BY moved_by_id, moved_by;
$$;
GRANT EXECUTE ON FUNCTION gold.movimentos_qualificacao_resumo(timestamptz, timestamptz)
  TO anon, authenticated, service_role;
