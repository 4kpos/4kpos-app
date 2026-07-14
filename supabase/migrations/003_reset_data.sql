-- ── Reset total de datos (RESET TOTAL DE DATOS) ────────────────────────────
-- Llamada desde posapi acción reset_data. Borra de forma atómica: ventas,
-- productos, categorías, clientes, créditos/abonos, combos, turnos,
-- fichadas (clock in/out) y el log de auditoría (preservando la entrada del
-- propio reset). NO toca: usuarios, cfg (negocio/impuestos), settings,
-- payMethods, adminCode ni la licencia (tabla separada).
-- Usa FOR UPDATE para exclusión mutua, igual que pos_commit_sale.
CREATE OR REPLACE FUNCTION pos_reset_data(
  p_license_key TEXT,
  p_device_id   TEXT DEFAULT '',
  p_audit_entry JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
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

  RETURN jsonb_build_object('ok', true, 'data', v_data, 'reset_at', v_reset_at);
END;
$$;
