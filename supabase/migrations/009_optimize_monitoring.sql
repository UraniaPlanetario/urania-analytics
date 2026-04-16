-- Adicionar role_id e role_name na tabela de usuarios
ALTER TABLE bronze.kommo_users ADD COLUMN IF NOT EXISTS role_id BIGINT;
ALTER TABLE bronze.kommo_users ADD COLUMN IF NOT EXISTS role_name TEXT;
ALTER TABLE bronze.kommo_users ADD COLUMN IF NOT EXISTS group_id BIGINT;

-- Criar tabela materializada (nao view) pra performance
CREATE TABLE IF NOT EXISTS gold.user_activities_daily (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  user_name TEXT,
  role_name TEXT,
  activity_date DATE NOT NULL,
  activity_hour INT NOT NULL,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL,
  entity_type TEXT,
  activity_count INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, activity_date, activity_hour, event_type, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_uad_date ON gold.user_activities_daily(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_uad_user ON gold.user_activities_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_uad_category ON gold.user_activities_daily(category);

ALTER TABLE gold.user_activities_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access on uad" ON gold.user_activities_daily FOR SELECT USING (true);
CREATE POLICY "Allow service write on uad" ON gold.user_activities_daily FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT ON gold.user_activities_daily TO anon, authenticated;
GRANT ALL ON gold.user_activities_daily TO service_role;
GRANT USAGE ON SEQUENCE gold.user_activities_daily_id_seq TO service_role;
