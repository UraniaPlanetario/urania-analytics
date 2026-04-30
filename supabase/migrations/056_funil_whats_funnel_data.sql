-- RPC gold.funil_whats_funnel_data — alimenta o funil visual e os cards de
-- tempo médio na aba Histórico.
--
-- Retorna 1 row com counts e tempos médios, considerando os filtros aplicados:
--   - scope_total: leads que entraram no Vendas Whats no período
--   - passou_etapa_qtd: do scope, quantos passaram pela(s) etapa(s) filtrada(s).
--                      Quando sem filtro de etapa, = scope_total.
--   - ganhos_total / perdidos_total: leads do scope com mov pra Closed-won/lost.
--   - ganhos_apos_etapa / perdidos_apos_etapa: ganho/perda DEPOIS da entrada na
--                      etapa filtrada (= total quando sem filtro).
--   - tempo_medio_etapa_dias: média dias_na_etapa nas passagens pela(s) filtrada(s).
--                      Sem filtro = média geral de tempo nas etapas (cada passagem
--                      conta uma vez).
--   - tempo_medio_ate_ganho_dias / tempo_medio_ate_perdido_dias: dias entre primeira
--                      entrada na etapa filtrada (ou entrada no funil) e mov pra ganho/perdido.

CREATE OR REPLACE FUNCTION gold.funil_whats_funnel_data(
  p_from timestamptz,
  p_to   timestamptz,
  p_etapas bigint[],
  p_responsaveis text[]
)
RETURNS TABLE (
  scope_total                  bigint,
  passou_etapa_qtd             bigint,
  ganhos_total                 bigint,
  ganhos_apos_etapa            bigint,
  perdidos_total               bigint,
  perdidos_apos_etapa          bigint,
  tempo_medio_etapa_dias       numeric,
  tempo_medio_ate_ganho_dias   numeric,
  tempo_medio_ate_perdido_dias numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold', 'bronze'
AS $$
  WITH scope AS (
    SELECT lead_id, entrada_at FROM gold.funil_whats_leads_in_scope(p_from, p_to, p_responsaveis)
  ),
  primeira_entrada_etapa AS (
    SELECT s.lead_id, MIN(p.entrou_at) AS entrou_at
    FROM scope s
    JOIN gold.funil_whats_passagens p ON p.lead_id = s.lead_id
    WHERE p_etapas IS NOT NULL AND cardinality(p_etapas) > 0
      AND p.status_id = ANY(p_etapas)
    GROUP BY s.lead_id
  ),
  scope_passou AS (
    SELECT s.lead_id, s.entrada_at, pee.entrou_at AS entrou_etapa_at
    FROM scope s
    LEFT JOIN primeira_entrada_etapa pee ON pee.lead_id = s.lead_id
    WHERE p_etapas IS NULL OR cardinality(p_etapas) = 0
       OR pee.entrou_at IS NOT NULL
  ),
  primeira_ganho AS (
    SELECT lead_id, MIN(moved_at) AS moved_at
    FROM gold.leads_movements
    WHERE pipeline_to_id = 10832516 AND status_to_id = 142
    GROUP BY lead_id
  ),
  primeira_perda AS (
    SELECT lead_id, MIN(moved_at) AS moved_at
    FROM gold.leads_movements
    WHERE pipeline_to_id = 10832516 AND status_to_id = 143
    GROUP BY lead_id
  ),
  base AS (
    SELECT
      sp.lead_id, sp.entrada_at, sp.entrou_etapa_at,
      pg.moved_at AS ganho_at,
      pp.moved_at AS perda_at
    FROM scope_passou sp
    LEFT JOIN primeira_ganho pg ON pg.lead_id = sp.lead_id
    LEFT JOIN primeira_perda pp ON pp.lead_id = sp.lead_id
  ),
  tempo_etapa AS (
    SELECT AVG(p.dias_na_etapa) AS dias
    FROM scope_passou sp
    JOIN gold.funil_whats_passagens p ON p.lead_id = sp.lead_id
    WHERE (p_etapas IS NULL OR cardinality(p_etapas) = 0
           OR p.status_id = ANY(p_etapas))
  )
  SELECT
    (SELECT COUNT(*) FROM scope)::bigint AS scope_total,
    (SELECT COUNT(*) FROM scope_passou)::bigint AS passou_etapa_qtd,
    (SELECT COUNT(*) FROM base WHERE ganho_at IS NOT NULL)::bigint AS ganhos_total,
    (SELECT COUNT(*) FROM base
     WHERE ganho_at IS NOT NULL
       AND (entrou_etapa_at IS NULL OR ganho_at >= entrou_etapa_at))::bigint AS ganhos_apos_etapa,
    (SELECT COUNT(*) FROM base WHERE perda_at IS NOT NULL)::bigint AS perdidos_total,
    (SELECT COUNT(*) FROM base
     WHERE perda_at IS NOT NULL
       AND (entrou_etapa_at IS NULL OR perda_at >= entrou_etapa_at))::bigint AS perdidos_apos_etapa,
    (SELECT ROUND(dias::numeric, 2) FROM tempo_etapa) AS tempo_medio_etapa_dias,
    (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (
              ganho_at - COALESCE(entrou_etapa_at, entrada_at)
            )) / 86400.0)::numeric, 2)
     FROM base
     WHERE ganho_at IS NOT NULL
       AND ganho_at >= COALESCE(entrou_etapa_at, entrada_at)) AS tempo_medio_ate_ganho_dias,
    (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (
              perda_at - COALESCE(entrou_etapa_at, entrada_at)
            )) / 86400.0)::numeric, 2)
     FROM base
     WHERE perda_at IS NOT NULL
       AND perda_at >= COALESCE(entrou_etapa_at, entrada_at)) AS tempo_medio_ate_perdido_dias;
$$;

GRANT EXECUTE ON FUNCTION gold.funil_whats_funnel_data(timestamptz, timestamptz, bigint[], text[])
  TO anon, authenticated;
