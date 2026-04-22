-- ============================================================================
-- RPCs novas para o Monitoramento de Usuários (Visão Geral unificada)
-- ============================================================================

-- Mensagens enviadas + leads distintos por usuário no período
CREATE OR REPLACE FUNCTION gold.mensagens_por_user_lead(
  p_from timestamptz,
  p_to timestamptz
) RETURNS TABLE(user_id bigint, total_msgs bigint, leads_distintos bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    criado_por_id AS user_id,
    COUNT(*)::bigint AS total_msgs,
    COUNT(DISTINCT lead_id)::bigint AS leads_distintos
  FROM gold.cubo_historico_mensagens
  WHERE tipo = 'enviada'
    AND criado_por_id IS NOT NULL
    AND data_criacao >= p_from
    AND data_criacao <= p_to
  GROUP BY criado_por_id;
$$;

GRANT EXECUTE ON FUNCTION gold.mensagens_por_user_lead(timestamptz, timestamptz)
  TO anon, authenticated, service_role;

-- Top N campos alterados no período (via whitelist alteracoes_humanas)
CREATE OR REPLACE FUNCTION gold.top_campos_alterados_periodo(
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer DEFAULT 20
) RETURNS TABLE(campo_nome text, total bigint)
LANGUAGE sql STABLE
AS $$
  SELECT campo_nome, COUNT(*)::bigint AS total
  FROM gold.alteracoes_humanas
  WHERE data_criacao >= p_from
    AND data_criacao <= p_to
    AND campo_nome IS NOT NULL
  GROUP BY campo_nome
  ORDER BY total DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION gold.top_campos_alterados_periodo(timestamptz, timestamptz, integer)
  TO anon, authenticated, service_role;
