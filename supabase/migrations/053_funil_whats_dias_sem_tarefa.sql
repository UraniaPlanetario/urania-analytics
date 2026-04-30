-- Estende gold.funil_whats_leads_atual com:
--   - lead_updated_at: última atualização do lead no Kommo
--   - dias_sem_tarefa: dias desde lead_updated_at, quando não há tarefa
--                      aberta. NULL quando há tarefa.
--
-- Limitação: o sync atual de bronze.kommo_tasks só puxa tarefas ABERTAS,
-- então não temos histórico real de "quando a última tarefa foi concluída".
-- O updated_at do lead é o melhor proxy disponível — mexe quando uma tarefa
-- é fechada, quando uma mensagem chega, quando um custom field é alterado,
-- etc. Não é exato mas dá o sinal de "lead esquecido sem ação recente".
--
-- DROP+CREATE necessário porque adicionamos coluna no meio da lista
-- (CREATE OR REPLACE VIEW não permite reordenar colunas existentes).

DROP VIEW IF EXISTS gold.funil_whats_leads_atual;

CREATE VIEW gold.funil_whats_leads_atual AS
WITH
entrada_funil AS (
  SELECT lead_id, MIN(moved_at) AS entrada_at
  FROM gold.leads_movements
  WHERE pipeline_to_id = 10832516
    AND (pipeline_from_id IS DISTINCT FROM 10832516)
  GROUP BY lead_id
),
entrada_etapa_atual AS (
  SELECT m.lead_id, MAX(m.moved_at) AS entrada_at
  FROM gold.leads_movements m
  JOIN bronze.kommo_leads_raw l ON l.id = m.lead_id
  WHERE m.pipeline_to_id = 10832516
    AND m.status_to_id = l.status_id
  GROUP BY m.lead_id
),
ultima_msg AS (
  SELECT lead_id, MAX(data_criacao) AS enviada_at
  FROM gold.cubo_historico_mensagens
  WHERE tipo = 'enviada'
  GROUP BY lead_id
),
tarefa_aberta AS (
  SELECT DISTINCT ON (entity_id)
    entity_id AS lead_id,
    id AS tarefa_id,
    text AS tarefa_text,
    complete_till AS tarefa_complete_till,
    responsible_user_id AS tarefa_responsible_user_id,
    responsible_user_name AS tarefa_responsible_user_name,
    created_at AS tarefa_created_at
  FROM bronze.kommo_tasks
  WHERE entity_type = 'leads'
    AND COALESCE(is_completed, false) = false
  ORDER BY entity_id, complete_till ASC NULLS LAST
)
SELECT
  l.id AS lead_id,
  l.name AS lead_name,
  l.responsible_user_id,
  l.responsible_user_name,
  l.custom_fields->>'Vendedor/Consultor' AS vendedor_consultor,
  l.pipeline_id,
  l.pipeline_name,
  l.status_id,
  l.status_name,
  l.created_at AS lead_created_at,
  l.updated_at AS lead_updated_at,
  COALESCE(ef.entrada_at, l.created_at) AS entrada_funil_at,
  COALESCE(ee.entrada_at, ef.entrada_at, l.created_at) AS entrada_etapa_atual_at,
  EXTRACT(EPOCH FROM (NOW() - COALESCE(ef.entrada_at, l.created_at))) / 86400.0
    AS dias_no_funil,
  EXTRACT(EPOCH FROM (NOW() - COALESCE(ee.entrada_at, ef.entrada_at, l.created_at))) / 86400.0
    AS dias_na_etapa_atual,
  ta.tarefa_id,
  ta.tarefa_text,
  ta.tarefa_complete_till,
  ta.tarefa_responsible_user_id,
  ta.tarefa_responsible_user_name,
  CASE
    WHEN ta.tarefa_complete_till IS NULL THEN NULL
    WHEN ta.tarefa_complete_till >= NOW() THEN 0
    ELSE EXTRACT(EPOCH FROM (NOW() - ta.tarefa_complete_till)) / 86400.0
  END AS dias_tarefa_vencida,
  CASE
    WHEN ta.tarefa_id IS NOT NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (NOW() - l.updated_at)) / 86400.0
  END AS dias_sem_tarefa,
  um.enviada_at AS ultima_msg_enviada_at,
  CASE
    WHEN um.enviada_at IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (NOW() - um.enviada_at)) / 86400.0
  END AS dias_sem_interacao
FROM bronze.kommo_leads_raw l
LEFT JOIN entrada_funil       ef ON ef.lead_id = l.id
LEFT JOIN entrada_etapa_atual ee ON ee.lead_id = l.id
LEFT JOIN tarefa_aberta       ta ON ta.lead_id = l.id
LEFT JOIN ultima_msg          um ON um.lead_id = l.id
WHERE l.pipeline_id = 10832516
  AND l.is_deleted IS NOT TRUE;

GRANT SELECT ON gold.funil_whats_leads_atual TO anon, authenticated;
GRANT ALL    ON gold.funil_whats_leads_atual TO service_role;
