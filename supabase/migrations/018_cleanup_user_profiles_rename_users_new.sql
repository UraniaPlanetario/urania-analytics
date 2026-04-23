-- Cleanup fase 6 do RBAC: remove user_profiles legado e renomeia users_new para users.
-- FKs de user_departments/user_platform_access/route_access_rules/system_logs
-- seguem o rename automaticamente (referência interna por OID).

DROP TABLE IF EXISTS public.user_profiles CASCADE;

ALTER TABLE public.users_new RENAME TO users;

ALTER INDEX IF EXISTS users_new_pkey RENAME TO users_pkey;
ALTER INDEX IF EXISTS users_new_email_key RENAME TO users_email_key;
ALTER INDEX IF EXISTS users_new_auth_user_id_key RENAME TO users_auth_user_id_key;

DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.users'::regclass AND contype = 'p';
  IF cname IS NOT NULL AND cname <> 'users_pkey' THEN
    EXECUTE format('ALTER TABLE public.users RENAME CONSTRAINT %I TO users_pkey', cname);
  END IF;
END $$;
