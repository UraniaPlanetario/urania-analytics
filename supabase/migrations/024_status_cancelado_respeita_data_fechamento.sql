-- Regra de negócio v2 pro status_lead em gold.cubo_leads_consolidado:
--
-- ANTES: qualquer lead com `custom_fields.'Cancelado (Onboarding)'='Sim'` virava
--        status_lead='Cancelado', mesmo que tivesse um novo fechamento posterior.
--
-- AGORA: só classifica como Cancelado se a data_cancelamento for posterior à
--        data_de_fechamento (ou se não houver data_de_fechamento). Leads que
--        foram cancelados e depois voltaram a fechar (nova venda para o mesmo
--        cliente) entram como Venda Fechada, como esperado pelo time comercial.
--
-- A coluna booleana `cancelado` continua refletindo o flag histórico do CRM,
-- independentemente do status_lead — útil para auditoria de "quais leads já
-- foram cancelados em algum momento".

CREATE OR REPLACE FUNCTION gold.refresh_leads_consolidado()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '600s'
AS $function$
DECLARE row_count INT;
BEGIN
  TRUNCATE gold.cubo_leads_consolidado;

  WITH
  saida_onb AS (
    SELECT lead_id, MIN(moved_at) AS saida_at
    FROM gold.leads_movements
    WHERE pipeline_from IN ('Onboarding Escolas','Onboarding SME','Financeiro')
      AND (pipeline_to = 'Clientes - CS'
           OR pipeline_to NOT IN ('Onboarding Escolas','Onboarding SME','Financeiro','Shopping Fechados'))
    GROUP BY lead_id
  ),
  cs_alterou_pos AS (
    SELECT DISTINCT a.lead_id
    FROM gold.cubo_alteracao_campos_eventos a
    JOIN saida_onb s ON s.lead_id = a.lead_id
    JOIN bronze.kommo_users ku ON ku.name = a.criado_por
    WHERE a.campo_id = 847427 AND a.data_criacao > s.saida_at
      AND ku.group_name = 'Sucesso do cliente'
  ),
  fecha_mov AS (
    SELECT DISTINCT ON (lead_id) lead_id, moved_by
    FROM gold.leads_movements
    WHERE status_to ILIKE '%closed - won%'
      AND pipeline_from NOT IN ('Onboarding Escolas','Onboarding SME','Financeiro','Clientes - CS','Shopping Fechados')
    ORDER BY lead_id, moved_at DESC
  ),
  cs_atuais AS (SELECT name FROM bronze.kommo_users WHERE group_name = 'Sucesso do cliente')
  INSERT INTO gold.cubo_leads_consolidado
    (id_lead, id_passagem, nome_lead, valor_total, funil_atual, estagio_atual, funil_lead, status_lead,
     vendedor, sdr, data_criacao, data_de_fechamento, data_e_hora_do_agendamento, data_cancelamento,
     tipo_lead, tipo_cliente, cidade_estado, produtos, numero_de_diarias, faixa_alunos, n_alunos,
     experiencia, conteudo_apresentacao, astronomo, canal_entrada, origem_oportunidade,
     horizonte_agendamento, turnos_evento, brinde, cancelado, is_deleted)
  SELECT
    l.id,
    l.id || '_' || COALESCE(l.pipeline_id::text,'0') || '_' || COALESCE(l.custom_fields->>'Data de Fechamento','0'),
    l.name, l.price, l.pipeline_name, l.status_name, l.pipeline_name,
    CASE
      WHEN l.custom_fields->>'Cancelado (Onboarding)' = 'Sim'
        AND (l.custom_fields->>'Data cancelamento') ~ '^\d{9,10}$'
        AND (
          (l.custom_fields->>'Data de Fechamento') IS NULL
          OR NOT ((l.custom_fields->>'Data de Fechamento') ~ '^\d{9,10}$')
          OR to_timestamp((l.custom_fields->>'Data cancelamento')::bigint)
             > to_timestamp((l.custom_fields->>'Data de Fechamento')::bigint)
        )
        THEN 'Cancelado'
      WHEN l.pipeline_name IN ('Onboarding Escolas','Onboarding SME','Financeiro','Clientes - CS','Shopping Fechados')
        AND l.custom_fields->>'Data de Fechamento' IS NOT NULL THEN 'Venda Fechada'
      WHEN l.status_name ILIKE '%perdida%' OR l.status_name ILIKE '%lost%' THEN 'Venda Perdida'
      ELSE 'Em andamento'
    END,
    COALESCE(
      ov.vendedor,
      CASE
        WHEN fm.moved_by IS NOT NULL AND (
               ca.lead_id IS NOT NULL
               OR (l.custom_fields->>'Vendedor/Consultor') IN (SELECT name FROM cs_atuais)
             )
        THEN fm.moved_by
        ELSE NULL
      END,
      l.custom_fields->>'Vendedor/Consultor'
    ),
    l.custom_fields->>'SDR', l.created_at,
    CASE WHEN (l.custom_fields->>'Data de Fechamento') ~ '^\d{9,10}$'
      THEN to_timestamp((l.custom_fields->>'Data de Fechamento')::bigint)::date ELSE NULL END,
    CASE WHEN (l.custom_fields->>'Data e Hora do Agendamento') ~ '^\d{9,10}$'
      THEN to_timestamp((l.custom_fields->>'Data e Hora do Agendamento')::bigint) ELSE NULL END,
    CASE WHEN (l.custom_fields->>'Data cancelamento') ~ '^\d{9,10}$'
      THEN to_timestamp((l.custom_fields->>'Data cancelamento')::bigint)::date ELSE NULL END,
    l.custom_fields->>'Tipo de cliente', l.custom_fields->>'Tipo de cliente',
    l.custom_fields->>'Cidade - Estado', l.custom_fields->>'Produtos', l.custom_fields->>'Nº de Diárias',
    l.custom_fields->>'Faixa de alunos', l.custom_fields->>'Nº de alunos',
    l.custom_fields->>'Experiência', l.custom_fields->>'Conteúdo da apresentação',
    l.custom_fields->>'Astrônomo', l.custom_fields->>'Canal de entrada',
    l.custom_fields->>'Origem da oportunidade', l.custom_fields->>'Horizonte de Agendamento',
    l.custom_fields->>'Turnos do evento', l.custom_fields->>'Brinde',
    COALESCE(l.custom_fields->>'Cancelado (Onboarding)'='Sim', FALSE),
    COALESCE(l.is_deleted, FALSE)
  FROM bronze.kommo_leads_raw l
  LEFT JOIN config.lead_vendedor_override ov ON ov.lead_id = l.id
  LEFT JOIN cs_alterou_pos ca ON ca.lead_id = l.id
  LEFT JOIN fecha_mov fm ON fm.lead_id = l.id
  WHERE l.is_deleted = FALSE OR l.is_deleted IS NULL;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  RETURN row_count || ' rows inserted';
END;
$function$;
