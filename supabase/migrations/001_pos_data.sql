-- Tabla para almacenar datos del POS por licencia
-- Ejecutar en: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS pos_data (
  license_key text PRIMARY KEY,
  data        jsonb        NOT NULL DEFAULT '{}',
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- RLS habilitado; el edge function usa service_role_key que bypass RLS
ALTER TABLE pos_data ENABLE ROW LEVEL SECURITY;
