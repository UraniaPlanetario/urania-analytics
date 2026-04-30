-- RPCs pra alimentar a aba Histórico do dashboard de Auditoria do Funil de Vendas.
-- Filtros padronizados (período, etapas, responsáveis), aplicados no scope:
--   "leads que entraram no Vendas WhatsApp no período" (criação direta ou
--   movimentação vinda de outro pipeline). De propósito não filtra a etapa
--   no scope — etapa filtra dentro das passagens, pra responder coisas como
--   "quantos leads (criados em abril) passaram pela Geladeira".

-- Helper: dado os filtros, retorna o set de leads in-scope.
CREATE OR REPLACE FUNCTION gold.funil_whats_leads_in_scope(
  p_from timestamptz,
  p_to   timestamptz,
  p_responsaveis text[]
)
RETURNS TABLE (lead_id bigint, entrada_at timestamptz, responsible_user_name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold', 'bronze'
AS $$
  -- Criação direta no Vendas Whats
  SELECT
    l.id AS lead_id,
    l.created_at AS entrada_at,
    l.responsible_user_name
  FROM bronze.kommo_leads_raw l
  WHERE l.pipeline_id = 10832516
    AND l.is_deleted IS NOT TRUE
    AND (p_from IS NULL OR l.created_at >= p_from)
    AND (p_to IS NULL OR l.created_at <= p_to)
    AND (p_responsaveis IS NULL OR cardinality(p_responsaveis) = 0
         OR l.responsible_user_name = ANY(p_responsaveis))
  UNION
  -- Movidos pra Vendas Whats vindo de outro pipeline (primeira entrada no período)
  SELECT
    m.lead_id,
    MIN(m.moved_at) AS entrada_at,
    MAX(l.responsible_user_name) AS responsible_user_name
  FROM gold.leads_movements m
  JOIN bronze.kommo_leads_raw l ON l.id = m.lead_id
  WHERE m.pipeline_to_id = 10832516
    AND m.pipeline_from_id IS DISTINCT FROM 10832516
    AND l.is_deleted IS NOT TRUE
    AND (p_responsaveis IS NULL OR cardinality(p_responsaveis) = 0
         OR l.responsible_user_name = ANY(p_responsaveis))
  GROUP BY m.lead_id
  HAVING (p_from IS NULL OR MIN(m.moved_at) >= p_from)
     AND (p_to   IS NULL OR MIN(m.moved_at) <= p_to);
$$;

GRANT EXECUTE ON FUNCTION gold.funil_whats_leads_in_scope(timestamptz, timestamptz, text[])
  TO anon, authenticated;

-- Stats por etapa (passagem, estagnado, tempo médio)
CREATE OR REPLACE FUNCTION gold.funil_whats_etapa_stats(
  p_from timestamptz,
  p_to   timestamptz,
  p_etapas bigint[],
  p_responsaveis text[]
)
RETURNS TABLE (
  status_id     bigint,
  passagem_qtd  bigint,
  estagnado_qtd bigint,
  tempo_medio_dias numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold', 'bronze'
AS $$
  WITH scope AS (
    SELECT lead_id FROM gold.funil_whats_leads_in_scope(p_from, p_to, p_responsaveis)
  ),
  -- Filtro de etapa: leads que tiveram alguma passagem por pelo menos uma
  -- das etapas selecionadas (= "passou pela etapa filtrada")
  scope_filtrado AS (
    SELECT DISTINCT s.lead_id
    FROM scope s
    WHERE p_etapas IS NULL OR cardinality(p_etapas) = 0
       OR EXISTS (
         SELECT 1 FROM gold.funil_whats_passagens p
         WHERE p.lead_id = s.lead_id AND p.status_id = ANY(p_etapas)
       )
  ),
  passagens_scope AS (
    SELECT p.*
    FROM gold.funil_whats_passagens p
    JOIN scope_filtrado sf ON sf.lead_id = p.lead_id
  )
  SELECT
    ps.status_id,
    COUNT(DISTINCT ps.lead_id) AS passagem_qtd,
    COUNT(DISTINCT ps.lead_id) FILTER (
      WHERE ps.eh_atual
        AND (p_from IS NULL OR ps.entrou_at < p_from)
    ) AS estagnado_qtd,
    ROUND(AVG(ps.dias_na_etapa)::numeric, 2) AS tempo_medio_dias
  FROM passagens_scope ps
  GROUP BY ps.status_id;
$$;

GRANT EXECUTE ON FUNCTION gold.funil_whats_etapa_stats(timestamptz, timestamptz, bigint[], text[])
  TO anon, authenticated;

-- KPIs gerais + criados por hora (BRT)
CREATE OR REPLACE FUNCTION gold.funil_whats_kpis(
  p_from timestamptz,
  p_to   timestamptz,
  p_etapas bigint[],
  p_responsaveis text[]
)
RETURNS TABLE (
  criados_total bigint,
  perdidos_total bigint,
  hora int,
  total_hora bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'gold', 'bronze'
AS $$
  WITH scope AS (
    SELECT lead_id, entrada_at FROM gold.funil_whats_leads_in_scope(p_from, p_to, p_responsaveis)
  ),
  scope_filtrado AS (
    SELECT s.*
    FROM scope s
    WHERE p_etapas IS NULL OR cardinality(p_etapas) = 0
       OR EXISTS (
         SELECT 1 FROM gold.funil_whats_passagens p
         WHERE p.lead_id = s.lead_id AND p.status_id = ANY(p_etapas)
       )
  ),
  -- Perdidos = leads do scope que tiveram mov pra Closed-lost (143) no período
  perdidos AS (
    SELECT COUNT(DISTINCT m.lead_id) AS qtd
    FROM gold.leads_movements m
    JOIN scope_filtrado sf ON sf.lead_id = m.lead_id
    WHERE m.pipeline_to_id = 10832516
      AND m.status_to_id = 143
      AND (p_from IS NULL OR m.moved_at >= p_from)
      AND (p_to   IS NULL OR m.moved_at <= p_to)
  ),
  por_hora AS (
    SELECT
      EXTRACT(HOUR FROM (sf.entrada_at AT TIME ZONE 'America/Sao_Paulo'))::int AS hora,
      COUNT(*) AS total
    FROM scope_filtrado sf
    GROUP BY 1
  )
  SELECT
    (SELECT COUNT(*) FROM scope_filtrado),
    (SELECT qtd FROM perdidos),
    ph.hora,
    ph.total
  FROM por_hora ph;
$$;

GRANT EXECUTE ON FUNCTION gold.funil_whats_kpis(timestamptz, timestamptz, bigint[], text[])
  TO anon, authenticated;
