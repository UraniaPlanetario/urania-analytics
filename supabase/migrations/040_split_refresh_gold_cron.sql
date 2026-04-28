-- A edge function refresh-gold-tables encadeava todos os refreshes em uma só
-- chamada, ultrapassando o timeout de 150s do Supabase Edge. Resultado: cron
-- vinha falhando silenciosamente com 504 IDLE_TIMEOUT desde o backfill que
-- aumentou o volume.
--
-- Solução: pg_cron chama as funções gold.refresh_*() DIRETO via SQL, sem
-- passar por edge function. Cada função tem statement_timeout = 300s do PG.
-- Jobs espaçados por 5 min pra ficarem em sequência (tempo_resposta depende
-- de historico_mensagens; leads_closed depende de leads_movements).

SELECT cron.unschedule('refresh-gold-tables-daily');

SELECT cron.schedule('refresh-leads-movements',         '0 8 * * *',  $$ SELECT gold.refresh_leads_movements();         $$);
SELECT cron.schedule('refresh-historico-mensagens',     '5 8 * * *',  $$ SELECT gold.refresh_historico_mensagens();     $$);
SELECT cron.schedule('refresh-tempo-resposta',          '10 8 * * *', $$ SELECT gold.refresh_tempo_resposta();          $$);
SELECT cron.schedule('refresh-alteracao-campos',        '15 8 * * *', $$ SELECT gold.refresh_alteracao_campos();        $$);
SELECT cron.schedule('refresh-user-activities',         '20 8 * * *', $$ SELECT gold.refresh_user_activities();         $$);
SELECT cron.schedule('refresh-leads-closed',            '25 8 * * *', $$ SELECT gold.refresh_leads_closed();            $$);
SELECT cron.schedule('refresh-leads-consolidado',       '30 8 * * *', $$ SELECT gold.refresh_leads_consolidado();       $$);
SELECT cron.schedule('refresh-agendamentos-astronomos', '35 8 * * *', $$ SELECT gold.refresh_agendamentos_astronomos(); $$);
