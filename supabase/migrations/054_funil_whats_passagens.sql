-- View gold.funil_whats_passagens — 1 row por movimentação do lead pra
-- dentro de uma etapa do pipeline Vendas WhatsApp. Cada lead tem N rows
-- (uma pra cada vez que ele ENTROU em alguma etapa do funil).
--
-- Usado pelos gráficos "passagem por etapa", "leads estagnados" e
-- "tempo médio na etapa" da aba Histórico.
--
-- Limitação: não temos passagem inicial sintética pra leads criados direto
-- no funil sem movimentação prévia (o sync de events não captura "criação"
-- como movimentação, só transições). Por isso, leads que nasceram em
-- "Incoming leads" e nunca foram movidos NÃO aparecem aqui.

CREATE OR REPLACE VIEW gold.funil_whats_passagens AS
WITH movs_whats AS (
  SELECT
    m.lead_id,
    m.status_to_id AS status_id,
    m.moved_at AS entrou_at,
    LEAD(m.moved_at) OVER (PARTITION BY m.lead_id ORDER BY m.moved_at) AS proxima_mov_at
  FROM gold.leads_movements m
  WHERE m.pipeline_to_id = 10832516
)
SELECT
  mw.lead_id,
  mw.status_id,
  mw.entrou_at,
  mw.proxima_mov_at AS saiu_at,
  CASE
    WHEN mw.proxima_mov_at IS NULL
      THEN EXTRACT(EPOCH FROM (NOW() - mw.entrou_at)) / 86400.0
    ELSE EXTRACT(EPOCH FROM (mw.proxima_mov_at - mw.entrou_at)) / 86400.0
  END AS dias_na_etapa,
  (mw.proxima_mov_at IS NULL AND l.status_id = mw.status_id AND l.pipeline_id = 10832516) AS eh_atual,
  l.created_at AS lead_created_at,
  l.responsible_user_name,
  l.custom_fields->>'Vendedor/Consultor' AS vendedor_consultor
FROM movs_whats mw
JOIN bronze.kommo_leads_raw l ON l.id = mw.lead_id
WHERE l.is_deleted IS NOT TRUE;

GRANT SELECT ON gold.funil_whats_passagens TO anon, authenticated;
GRANT ALL    ON gold.funil_whats_passagens TO service_role;
