-- ── Fix: pos_reset_data no limpiaba saved_by ────────────────────────────────
-- El UPDATE de pos_reset_data (003_reset_data.sql) reescribe data/updated_at
-- pero deja saved_by con el valor del último 'save' normal (device_id de la
-- PC que empujó por última vez). El cliente en Realtime hace:
--   if(row.saved_by && row.saved_by===_deviceCode){SKIP} // "es mi propio eco"
-- ANTES de mirar _resetAt. Si esa PC sigue conectada, se salta su propio
-- evento de reset creyendo que es el eco de un guardado suyo, y nunca corre
-- _applyRemoteReset() por esa vía (aunque en la práctica esa PC no depende de
-- Realtime para verse afectada por SU PROPIO reset — lo maneja _applyLocalReset
-- de forma directa — sí importa para setups multi-PC donde el saved_by viejo
-- coincide con una PC que NO fue la que ejecutó el reset).
--
-- Fix: el reset pone saved_by=NULL. Con row.saved_by falsy, la guarda
-- "SKIP own device" no dispara para nadie, y todas las PCs conectadas evalúan
-- correctamente rowData._resetAt!==db._lastResetAt → _applyRemoteReset().
CREATE OR REPLACE FUNCTION public.pos_reset_data(
  p_license_key TEXT,
  p_targets     TEXT[],
  p_user        TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row           pos_data%ROWTYPE;
  v_data          JSONB;
  v_reset_at      TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_audit_entry   JSONB;
  v_has_ventas    BOOLEAN := 'ventas'    = ANY(p_targets);
  v_has_creditos  BOOLEAN := 'creditos'  = ANY(p_targets);
  v_has_productos BOOLEAN := 'productos' = ANY(p_targets);
  v_has_clientes  BOOLEAN := 'clientes'  = ANY(p_targets);
  v_has_combos    BOOLEAN := 'combos'    = ANY(p_targets);
BEGIN
  -- Nada seleccionado: no-op explícito, no es un error.
  IF p_targets IS NULL OR array_length(p_targets, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'warning', 'nada_seleccionado');
  END IF;

  SELECT * INTO v_row
  FROM pos_data
  WHERE license_key = p_license_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pos_reset_data: no existe fila en pos_data para license_key=%', p_license_key;
  END IF;

  v_data := COALESCE(v_row.data::jsonb, '{}'::jsonb);

  IF v_has_ventas THEN
    v_data := v_data || jsonb_build_object('sales','[]'::jsonb,'returns','[]'::jsonb,'orderNum',0);
  END IF;

  IF v_has_creditos THEN
    v_data := v_data || jsonb_build_object(
      'credits','[]'::jsonb,
      'creditSummary', jsonb_build_object('totalPending',0,'count',0)
    );
  END IF;

  IF v_has_productos THEN
    v_data := v_data || jsonb_build_object('products','[]'::jsonb,'categories','[]'::jsonb);
  END IF;

  IF v_has_clientes THEN
    v_data := v_data || jsonb_build_object('customers','[]'::jsonb);
  END IF;

  IF v_has_combos THEN
    v_data := v_data || jsonb_build_object('combos','[]'::jsonb,'specials','[]'::jsonb);
  END IF;

  -- Registrar la entrada de audit del reset (se agrega a lo que ya haya en
  -- auditLog, no se reemplaza — auditLog no es un target borrable en este
  -- diseño, así que su historial previo queda intacto).
  v_audit_entry := jsonb_build_object(
    'accion',      'RESET_DATA',
    'license_key', p_license_key,
    'targets',     to_jsonb(p_targets),
    'userName',    p_user,
    'timestamp',   v_reset_at
  );
  v_data := jsonb_set(
    v_data,
    '{auditLog}',
    COALESCE(v_data->'auditLog', '[]'::jsonb) || jsonb_build_array(v_audit_entry),
    true
  );
  v_data := v_data || jsonb_build_object('_resetAt', v_reset_at);

  -- saved_by=NULL (fix de este archivo): ninguna PC conectada debe leer este
  -- UPDATE como "eco de mi propio guardado" y saltarse el _applyRemoteReset.
  UPDATE pos_data
  SET data       = v_data::text,
      updated_at = NOW(),
      saved_by   = NULL
  WHERE license_key = p_license_key;

  IF v_has_productos THEN
    DELETE FROM categories
    WHERE license_key = p_license_key
      AND id NOT LIKE 'shift_status_%'
      AND id <> 'shift_status'
      AND id <> 'credit_summary';
  END IF;

  IF v_has_creditos THEN
    DELETE FROM categories
    WHERE license_key = p_license_key
      AND id = 'credit_summary';

    INSERT INTO categories (id, name, license_key)
    VALUES (
      'credit_summary',
      jsonb_build_object('totalPending',0,'count',0,'updatedAt',v_reset_at,'items','[]'::jsonb)::text,
      p_license_key
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'targets', to_jsonb(p_targets), 'reset_at', v_reset_at);
END;
$$;
