-- Sistema de alerta diário pros refreshes de gold. Roda 08:50 UTC (= 05:50 BRT)
-- após o último refresh agendado (08:35). Checa:
--   1. Cada cron `refresh-*` rodou hoje com sucesso?
--   2. As tabelas gold principais estão com dados recentes (até 2 dias atrasado é OK)?
-- Se achar problema, dispara POST pro webhook configurado no n8n com payload
-- estruturado. Se webhook vazio, no-op (alerta desligado).

CREATE TABLE IF NOT EXISTS config.alert_settings (
  id            int PRIMARY KEY DEFAULT 1,
  webhook_url   text,
  enabled       boolean NOT NULL DEFAULT true,
  notify_email  text,
  last_alert_at timestamptz,
  last_status   text,
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO config.alert_settings (id, webhook_url, notify_email)
VALUES (1, NULL, 'julia.penalva@uraniaplanetario.com.br')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON config.alert_settings TO anon, authenticated;
GRANT ALL    ON config.alert_settings TO service_role;
ALTER TABLE config.alert_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all_authenticated" ON config.alert_settings
  FOR SELECT TO authenticated, anon USING (true);

CREATE OR REPLACE FUNCTION gold.check_refresh_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  problemas jsonb := '[]'::jsonb;
  rec record;
  max_ts timestamptz;
BEGIN
  FOR rec IN
    SELECT j.jobname,
           (SELECT MAX(d.start_time) FROM cron.job_run_details d WHERE d.jobid = j.jobid AND d.start_time > now() - interval '26 hours') AS last_run,
           (SELECT d.status FROM cron.job_run_details d WHERE d.jobid = j.jobid AND d.start_time > now() - interval '26 hours' ORDER BY d.start_time DESC LIMIT 1) AS last_status
    FROM cron.job j
    WHERE j.jobname LIKE 'refresh-%'
  LOOP
    IF rec.last_run IS NULL THEN
      problemas := problemas || jsonb_build_object('tipo', 'cron_nao_rodou', 'job', rec.jobname);
    ELSIF rec.last_status <> 'succeeded' THEN
      problemas := problemas || jsonb_build_object('tipo', 'cron_falhou', 'job', rec.jobname, 'status', rec.last_status, 'last_run', rec.last_run);
    END IF;
  END LOOP;

  SELECT MAX(moved_at) INTO max_ts FROM gold.leads_movements;
  IF max_ts IS NULL OR max_ts < now() - interval '2 days' THEN
    problemas := problemas || jsonb_build_object('tipo', 'tabela_atrasada', 'tabela', 'leads_movements', 'max', max_ts);
  END IF;

  SELECT MAX(data_fechamento_fmt::timestamp) INTO max_ts FROM gold.leads_closed;
  IF max_ts IS NULL OR max_ts < now() - interval '2 days' THEN
    problemas := problemas || jsonb_build_object('tipo', 'tabela_atrasada', 'tabela', 'leads_closed', 'max', max_ts);
  END IF;

  SELECT MAX(activity_date::timestamp) INTO max_ts FROM gold.user_activities_daily;
  IF max_ts IS NULL OR max_ts < now() - interval '2 days' THEN
    problemas := problemas || jsonb_build_object('tipo', 'tabela_atrasada', 'tabela', 'user_activities_daily', 'max', max_ts);
  END IF;

  RETURN jsonb_build_object(
    'checked_at', now(),
    'problemas', problemas,
    'tem_problema', jsonb_array_length(problemas) > 0
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION gold.check_refresh_health() TO service_role, authenticated;

CREATE OR REPLACE FUNCTION gold.check_and_alert_refresh()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  health jsonb;
  cfg config.alert_settings;
  request_id bigint;
BEGIN
  health := gold.check_refresh_health();
  SELECT * INTO cfg FROM config.alert_settings WHERE id = 1;

  UPDATE config.alert_settings
  SET last_alert_at = now(),
      last_status = CASE
        WHEN (health->>'tem_problema')::boolean THEN 'problemas detectados'
        ELSE 'tudo ok'
      END
  WHERE id = 1;

  IF NOT (health->>'tem_problema')::boolean THEN
    RETURN jsonb_build_object('alerted', false, 'reason', 'tudo ok');
  END IF;
  IF NOT cfg.enabled THEN
    RETURN jsonb_build_object('alerted', false, 'reason', 'alertas desligados');
  END IF;
  IF cfg.webhook_url IS NULL OR cfg.webhook_url = '' THEN
    RETURN jsonb_build_object('alerted', false, 'reason', 'webhook nao configurado', 'health', health);
  END IF;

  SELECT net.http_post(
    url := cfg.webhook_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'project', 'BI Urânia',
      'environment', 'production',
      'subject', '⚠ Refresh diário do BI falhou',
      'to', cfg.notify_email,
      'health', health
    ),
    timeout_milliseconds := 10000
  ) INTO request_id;

  RETURN jsonb_build_object('alerted', true, 'request_id', request_id, 'health', health);
END;
$function$;

GRANT EXECUTE ON FUNCTION gold.check_and_alert_refresh() TO service_role;

SELECT cron.schedule(
  'refresh-health-alert',
  '50 8 * * *',
  $$ SELECT gold.check_and_alert_refresh(); $$
);
