-- Regra v4 de "vendedor efetivo" em gold.cubo_leads_consolidado:
-- Amplia a v3 para também disparar o fallback quando o valor atual do custom field
-- 'Vendedor/Consultor' pertence a um usuário do grupo 'Sucesso do cliente' E existe
-- moved_by em `Closed - won` de funil de vendas. Motivo: a automação antiga do CRM
-- atribuía automaticamente a "conta CS" ao lead quando ele caía em Clientes - CS, sem
-- gerar um evento rastreável com criado_por (ator = null). A v3 não pegava esses casos.

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
      WHEN l.custom_fields->>'Cancelado (Onboarding)'='Sim' THEN 'Cancelado'
      WHEN l.pipeline_name IN ('Onboarding Escolas','Onboarding SME','Financeiro','Clientes - CS','Shopping Fechados')
        AND l.custom_fields->>'Data de Fechamento' IS NOT NULL THEN 'Venda Fechada'
      WHEN l.status_name ILIKE '%perdida%' OR l.status_name ILIKE '%lost%' THEN 'Venda Perdida'
      ELSE 'Em andamento'
    END,
    -- Regra v4: override > (CS alterou pós-saída OU CF atual é de CS) + moved_by existe → moved_by > custom field
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

-- Override manual: Colégio CEOC — Juliana moveu o lead pra Closed-won em plantão,
-- mas o vendedor real era Rafael (confirmado pelo XLSX exportado antes da automação de CS).
INSERT INTO config.lead_vendedor_override (lead_id, vendedor, motivo, criado_por) VALUES
  (24595621, 'Rafael Araújo',
   'Colégio CEOC: Juliana moveu o lead pra Closed-won em plantão, mas o vendedor real era Rafael (confirmado por XLSX exportado antes da automação de CS alterar o CF).',
   'ia@uraniaplanetario.com.br')
ON CONFLICT (lead_id) DO UPDATE SET vendedor = EXCLUDED.vendedor, motivo = EXCLUDED.motivo;
