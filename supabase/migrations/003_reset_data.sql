-- ── Reset total de datos (RESET TOTAL DE DATOS) ────────────────────────────
-- Llamada desde posapi acción reset_data. Borra de forma atómica: ventas,
-- productos, categorías, clientes, créditos/abonos, combos, turnos,
-- fichadas (clock in/out) y el log de auditoría (preservando la entrada del
-- propio reset). NO toca: usuarios, cfg (negocio/impuestos), settings,
-- payMethods, adminCode ni la licencia (tabla separada).
--
-- IMPORTANTE: este POS no usa tablas relacionales hijas para ventas/
-- créditos/combos — todo vive dentro de la columna pos_data.data (jsonb),
-- así que NO hay problema de orden de borrado por foreign keys ni falta de
-- ON DELETE CASCADE: no existen esas tablas.
--
-- La única tabla relacional aparte de pos_data que el dashboard móvil lee
-- directamente es "categories" (reutilizada como cache: categorías reales +
-- fila sintética "credit_summary" + filas "shift_status_<deviceId>"). Se
-- limpia aquí también para que el dashboard no quede con datos cacheados
-- obsoletos tras el reset.
--
-- SECURITY DEFINER: se ejecuta con los privilegios del dueño de la función
-- (normalmente el rol que la crea en el SQL Editor, con bypass de RLS),
-- en vez de depender de que el invocador (service_role vía el edge
-- function) tenga privilegios suficientes. search_path fijo por seguridad.
--
-- Usa FOR UPDATE para exclusión mutua, igual que pos_commit_sale.
CREATE OR REPLACE FUNCTION pos_reset_data(
  p_license_key TEXT,
  p_device_id   TEXT DEFAULT '',
  p_audit_entry JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row       pos_data%ROWTYPE;
  v_data      JSONB;
  v_employees JSONB;
  v_reset_at  TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
BEGIN
  SELECT * INTO v_row
  FROM pos_data
  WHERE license_key = p_license_key
  FOR UPDATE;

  v_data := COALESCE(v_row.data, '{}'::jsonb);

  -- Limpiar fichadas de cada empleado, conservando el registro del empleado
  SELECT COALESCE(
    jsonb_agg(elem || jsonb_build_object('clockEvents','[]'::jsonb,'clockHistory','[]'::jsonb)),
    '[]'::jsonb
  )
  INTO v_employees
  FROM jsonb_array_elements(COALESCE(v_data->'employees','[]'::jsonb)) AS elem;

  v_data := v_data || jsonb_build_object(
    'products',      '[]'::jsonb,
    'categories',     '[]'::jsonb,
    'sales',          '[]'::jsonb,
    'returns',        '[]'::jsonb,
    'orderNum',       1,
    'customers',      '[]'::jsonb,
    'credits',        '[]'::jsonb,
    'combos',         '[]'::jsonb,
    'shifts',         '[]'::jsonb,
    'fundAmount',     0,
    'employees',      v_employees,
    'auditLog',       CASE WHEN p_audit_entry IS NOT NULL THEN jsonb_build_array(p_audit_entry) ELSE '[]'::jsonb END,
    'creditSummary',  jsonb_build_object('totalPending',0,'count',0),
    '_resetAt',       v_reset_at
  );

  IF v_data ? 'cfg' THEN
    v_data := jsonb_set(v_data, '{cfg,pendingShiftNote}', 'null'::jsonb, true);
  END IF;

  INSERT INTO pos_data (license_key, data, updated_at, saved_by)
  VALUES (p_license_key, v_data, NOW(), p_device_id)
  ON CONFLICT (license_key) DO UPDATE
    SET data       = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at,
        saved_by   = EXCLUDED.saved_by;

  -- ── Limpiar cache del dashboard móvil (tabla "categories") ───────────────
  -- Categorías reales (excluye las filas sintéticas credit_summary / shift_status_*)
  DELETE FROM categories
  WHERE license_key = p_license_key
    AND id <> 'credit_summary'
    AND id NOT LIKE 'shift_status_%';

  -- Resumen de créditos: se re-inserta en cero en vez de borrarlo, porque el
  -- dashboard solo actualiza su vista si la fila EXISTE (una fila ausente
  -- deja el último valor cacheado en pantalla, no un cero).
  DELETE FROM categories
  WHERE license_key = p_license_key
    AND id = 'credit_summary';

  INSERT INTO categories (id, name, license_key)
  VALUES (
    'credit_summary',
    jsonb_build_object('totalPending',0,'count',0,'updatedAt',v_reset_at,'items','[]'::jsonb)::text,
    p_license_key
  );

  RETURN jsonb_build_object('ok', true, 'data', v_data, 'reset_at', v_reset_at);
END;
$$;
