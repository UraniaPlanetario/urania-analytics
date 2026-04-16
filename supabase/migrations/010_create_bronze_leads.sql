-- Bronze: snapshot de leads do Kommo
CREATE TABLE IF NOT EXISTS bronze.kommo_leads_raw (
  id BIGINT PRIMARY KEY,
  name TEXT,
  price NUMERIC,
  responsible_user_id BIGINT,
  group_id BIGINT,
  status_id BIGINT,
  pipeline_id BIGINT,
  loss_reason_id BIGINT,
  created_by BIGINT,
  updated_by BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closest_task_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  pipeline_name TEXT,
  status_name TEXT,
  responsible_user_name TEXT,
  custom_fields JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kommo_leads_pipeline ON bronze.kommo_leads_raw(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_responsible ON bronze.kommo_leads_raw(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_status ON bronze.kommo_leads_raw(status_id);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_created ON bronze.kommo_leads_raw(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_closed ON bronze.kommo_leads_raw(closed_at);

ALTER TABLE bronze.kommo_leads_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read kommo_leads" ON bronze.kommo_leads_raw FOR SELECT USING (true);
GRANT SELECT ON bronze.kommo_leads_raw TO anon, authenticated;
GRANT ALL ON bronze.kommo_leads_raw TO service_role;
