-- ── Reset de datos por targets (RESET TOTAL DE DATOS, selectivo) ───────────
-- Llamada desde posapi acción reset_data. El cliente elige qué borrar via
-- checkboxes y manda p_targets con cero o más de:
--   'ventas' | 'creditos' | 'productos' | 'clientes' | 'combos'
--
-- p_user: usuario admin ya autenticado por posapi (bcrypt validado ahí, no
-- acá) — se guarda tal cual en la entrada de audit para saber QUIÉN corrió
-- el reset, no solo que pasó.
--
-- ESQUEMA REAL CONFIRMADO (no es el que asumían las versiones anteriores):
--   pos_data.data es TEXT (no jsonb nativo) — se lee con ::jsonb y se
--   guarda de vuelta con ::text. Columnas de pos_data: id uuid,
--   license_key text, data text, updated_at timestamptz, saved_by text.
--
-- Mapeo target → claves de "data" que se vacían:
--   ventas    → sales:[], returns:[], orderNum:0
--   creditos  → credits:[], creditSummary:{totalPending:0,count:0}
--   productos → products:[], categories:[]
--   clientes  → customers:[]
--   combos    → combos:[], specials:[]
--
-- NUNCA se tocan (ni aunque vinieran en p_targets, que no es posible porque
-- solo se reconocen los 5 valores de arriba): adminCode, cfg, settings,
-- payMethods, fundAmount, users, employees. Tampoco se borra la fila de
-- pos_data — solo se reescribe la columna "data".
--
-- Tabla "categories" (cache del dashboard móvil, reutilizada como key-value):
--   - target 'productos' → borra filas reales de categoría del license_key,
--     preservando shift_status_* (estado de turno en vivo) Y credit_summary
--     (esa la maneja el target 'creditos' de forma independiente, para que
--     nunca quede ausente sin importar qué combinación de targets se mande).
--   - target 'creditos'  → borra y re-inserta credit_summary en cero. Se
--     re-inserta (no se deja ausente) porque el dashboard móvil solo
--     refresca su vista si la fila EXISTE.
--
-- SECURITY DEFINER + search_path fijo: bypassa RLS sin depender de que el
-- invocador (service_role vía el edge function) tenga privilegios propios.
--
-- Atomicidad: todo corre dentro de la ejecución implícita de la función; si
-- cualquier sentencia falla, Postgres revierte todo. No hay bloque
-- EXCEPTION, así que cualquier error interno se propaga tal cual (mismo
-- message/detail/hint/sqlstate) hacia supabase.rpc() en el edge function.
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

  UPDATE pos_data
  SET data       = v_data::text,
      updated_at = NOW()
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
