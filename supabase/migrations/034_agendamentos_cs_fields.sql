-- Adiciona campos da aba CS no card do agendamento: "Produtos já contratados"
-- e "Cliente desde" (ano que a escola virou cliente). Útil pro astrônomo
-- saber se é uma escola recorrente e o que ela já tem contratado.

ALTER TABLE gold.agendamentos_astronomos
  ADD COLUMN IF NOT EXISTS produtos_contratados text,
  ADD COLUMN IF NOT EXISTS cliente_desde text;

CREATE OR REPLACE FUNCTION gold.refresh_agendamentos_astronomos()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '300s'
AS $function$
DECLARE row_count INT;
BEGIN
  TRUNCATE gold.agendamentos_astronomos;

  INSERT INTO gold.agendamentos_astronomos
    (task_id, lead_id, nome_tarefa, status_tarefa, data_criacao, data_conclusao,
     is_completed, task_type_id, tipo_tarefa, desc_tarefa, astronomo, criado_por_id,
     nome_escola, valor_venda, produtos, numero_alunos, data_agendamento,
     local_instalacao, turno, conteudo_apresentacao, responsavel_evento, astronomo_card,
     numero_diarias, cupula, segmento, cidade, uf, cidade_estado, endereco,
     coordenada, latitude, longitude, telefone_responsavel,
     nota_nps, nps, avaliacao_geral, avaliacao_astronomo, brinde,
     produtos_contratados, cliente_desde)
  SELECT
    t.id, t.entity_id, NULLIF(t.text, ''),
    CASE
      WHEN t.is_completed THEN 'completa'
      WHEN t.complete_till < now() THEN 'atrasada'
      ELSE 'aberta'
    END,
    t.created_at, t.complete_till,
    COALESCE(t.is_completed, false),
    t.task_type_id, tt.name, tt.tipo_tarefa, tt.astronomo, t.created_by,
    l.custom_fields->>'Nome da escola',
    l.price,
    l.custom_fields->>'Produtos',
    l.custom_fields->>'Nº de alunos',
    CASE WHEN (l.custom_fields->>'Data e Hora do Agendamento') ~ '^\d{9,10}$'
      THEN to_timestamp((l.custom_fields->>'Data e Hora do Agendamento')::bigint)
      ELSE NULL END,
    l.custom_fields->>'Local coberto?',
    l.custom_fields->>'Turnos do evento',
    l.custom_fields->>'Conteúdo da apresentação',
    l.custom_fields->>'Responsável pelo evento',
    l.custom_fields->>'Astrônomo',
    l.custom_fields->>'Nº de Diárias',
    l.custom_fields->>'Cúpula',
    l.custom_fields->>'Faixa de alunos',
    CASE WHEN l.custom_fields->>'Cidade - Estado' ~ ' - '
      THEN trim(split_part(l.custom_fields->>'Cidade - Estado', ' - ', 1))
      ELSE l.custom_fields->>'Cidade - Estado' END,
    CASE WHEN l.custom_fields->>'Cidade - Estado' ~ ' - '
      THEN trim(split_part(l.custom_fields->>'Cidade - Estado', ' - ', 2))
      ELSE NULL END,
    l.custom_fields->>'Cidade - Estado',
    NULL::text,
    l.custom_fields->>'Coordenada',
    CASE WHEN l.custom_fields->>'Coordenada' ~ '^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$'
      THEN trim(split_part(l.custom_fields->>'Coordenada', ',', 1))::numeric
      ELSE NULL END,
    CASE WHEN l.custom_fields->>'Coordenada' ~ '^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$'
      THEN trim(split_part(l.custom_fields->>'Coordenada', ',', 2))::numeric
      ELSE NULL END,
    l.custom_fields->>'Telefone responsável pelo evento',
    l.custom_fields->>'Nota NPS',
    l.custom_fields->>'NPS',
    l.custom_fields->>'Avaliação da escola sobre exp. Geral',
    l.custom_fields->>'Avaliação da escola sobre Astrônomo',
    l.custom_fields->>'Brinde',
    l.custom_fields->>'Produtos já contratados',
    l.custom_fields->>'Cliente desde'
  FROM bronze.kommo_tasks t
  JOIN bronze.kommo_task_types tt ON tt.id = t.task_type_id
  LEFT JOIN bronze.kommo_leads_raw l ON l.id = t.entity_id
  WHERE t.responsible_user_name = 'Astrônomos'
    AND tt.astronomo IS NOT NULL;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  RETURN row_count || ' rows inserted';
END;
$function$;
