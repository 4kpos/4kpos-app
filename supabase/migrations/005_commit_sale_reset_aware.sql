-- ── pos_commit_sale: consciente del reset + fix de casteo jsonb/text ───────
--
-- Problema que resuelve (ver 004 para el bug hermano de "save"):
-- pos_commit_sale hacía "SET data = EXCLUDED.data" a ciegas con el
-- _buildSlim() completo del cliente, sin mirar nunca si ese cliente conocía
-- el último reset. Una PC atrasada (build viejo, realtime caído, estuvo
-- offline, o pura carrera con el evento del reset) que completa una venta
-- pisa productos/categorías/clientes/créditos/combos enteros con su foto
-- vieja — exactamente lo que resucitó los datos en el incidente real.
--
-- Fix: el cliente manda p_known_reset_at (su db._lastResetAt). Si no
-- coincide con el _resetAt actual en el servidor, la venta se trata como
-- "atrasada":
--   - La venta JAMÁS se pierde: se anexa por unión de id contra las sales/
--     returns que YA están en el servidor (mismo criterio que "save"),
--     nunca se descarta por veincrement atrasada.
--   - products/categories/customers/combos/specials/credits/creditSummary
--     se conservan tal cual están en el servidor (los del reset) — se
--     ignora lo que mandó el cliente para esos campos puntuales.
--   - cfg/settings/users/payMethods/employees/adminCode/fundAmount (no son
--     resetables) SÍ se toman del cliente, como siempre.
--   - Si el ítem vendido ya no existe en el catálogo actual del servidor:
--     se RECHAZA el commit completo con error 'product_not_found_stale'
--     (nunca silencioso, nunca queda un descuento de stock huérfano). El
--     cliente conserva la venta localmente y la sincroniza después vía la
--     acción "save" (que sí la anexa, sin tocar stock para ese ítem).
--   - Si hay stock pero es insuficiente: mismo error 'stock_insuficiente'
--     de siempre, ahora también con 'stale:true' para que el cliente sepa
--     que la causa probable es un reset reciente.
--   - El stock se decrementa SIEMPRE contra el catálogo del servidor (nunca
--     contra los números que trae el cliente), con piso duro en 0
--     (GREATEST(0, ...)) — nunca queda negativo.
--
-- Fix de casteo (independiente del reset): pos_data.data es TEXT en
-- producción (confirmado en 003_reset_data.sql), pero esta función leía
-- v_row.data->'products' sin castear a jsonb. Un operador "->" sobre text
-- no existe en Postgres sin cast explícito — probablemente esta validación
-- de stock viene fallando en cada venta desde que la columna es TEXT. Se
-- lee todo con ::jsonb (no-op inofensivo si algún día la columna vuelve a
-- ser jsonb nativo). La rama "no atrasado" mantiene el INSERT/UPSERT de
-- p_new_data tal cual estaba (sin cast) porque ese camino sí se ha probado
-- en producción y no hace falta tocarlo.
CREATE OR REPLACE FUNCTION pos_commit_sale(
  p_license_key    TEXT,
  p_items          JSONB,          -- [{id, qty, name}]  ← expandido del carrito
  p_new_data       JSONB,          -- _buildSlim() del cliente (puede estar atrasado)
  p_device_id      TEXT DEFAULT '',
  p_known_reset_at TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_row             pos_data%ROWTYPE;
  v_server_data     JSONB;
  v_product         JSONB;
  v_stock           NUMERIC;
  v_qty             NUMERIC;
  v_pid             TEXT;
  v_name            TEXT;
  v_server_reset_at TEXT;
  v_is_stale        BOOLEAN;
  v_reset_fields    TEXT[] := ARRAY['products','categories','customers','combos','specials','credits','creditSummary'];
  v_field           TEXT;
  v_data            JSONB;
  v_new_sales       JSONB;
  v_new_returns     JSONB;
BEGIN
  -- Bloquear la fila para exclusión mutua: el segundo PC espera aquí
  -- hasta que el primero complete el UPSERT final.
  SELECT * INTO v_row
  FROM pos_data
  WHERE license_key = p_license_key
  FOR UPDATE;

  v_server_data     := CASE WHEN FOUND THEN COALESCE(v_row.data::jsonb, '{}'::jsonb) ELSE '{}'::jsonb END;
  v_server_reset_at := v_server_data->>'_resetAt';
  v_is_stale        := v_server_reset_at IS NOT NULL AND (p_known_reset_at IS NULL OR p_known_reset_at <> v_server_reset_at);

  -- Validar stock SIEMPRE contra el catálogo actual del servidor (nunca
  -- contra lo que trae el cliente). En rama atrasada, un producto que no
  -- existe en el servidor rechaza el commit entero en vez de dejarlo pasar
  -- sin control (que sí era, y sigue siendo, el comportamiento cuando el
  -- cliente NO está atrasado — un producto ausente ahí puede ser legítimo,
  -- p.ej. recién creado, y no necesariamente indica un reset).
  IF FOUND AND p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR i IN 0..(jsonb_array_length(p_items) - 1) LOOP
      v_pid  := p_items->i->>'id';
      v_qty  := (p_items->i->>'qty')::NUMERIC;
      v_name := COALESCE(p_items->i->>'name', v_pid);

      SELECT elem INTO v_product
      FROM jsonb_array_elements(v_server_data->'products') AS elem
      WHERE elem->>'id' = v_pid
      LIMIT 1;

      IF v_product IS NULL THEN
        IF v_is_stale THEN
          RETURN jsonb_build_object(
            'ok', false, 'error', 'product_not_found_stale',
            'product', v_name, 'stale', true, 'reset_at', v_server_reset_at
          );
        END IF;
        CONTINUE; -- no atrasado: producto no encontrado, sin control de stock (comportamiento previo)
      END IF;

      IF v_product->>'stock' IS NULL THEN CONTINUE; END IF;

      v_stock := (v_product->>'stock')::NUMERIC;

      IF v_stock < v_qty THEN
        RETURN jsonb_build_object(
          'ok', false, 'error', 'stock_insuficiente',
          'product', v_name, 'needed', v_qty, 'available', v_stock,
          'stale', v_is_stale, 'reset_at', v_server_reset_at
        );
      END IF;
    END LOOP;
  END IF;

  IF NOT v_is_stale THEN
    -- Comportamiento original: el cliente está al día, se confía en su
    -- _buildSlim() completo (incluye su propio descuento de stock ya hecho).
    INSERT INTO pos_data (license_key, data, updated_at, saved_by)
    VALUES (p_license_key, p_new_data, NOW(), p_device_id)
    ON CONFLICT (license_key) DO UPDATE
      SET data       = EXCLUDED.data,
          updated_at = EXCLUDED.updated_at,
          saved_by   = EXCLUDED.saved_by;

    RETURN jsonb_build_object('ok', true);
  END IF;

  -- ── Rama atrasada ───────────────────────────────────────────────────────
  -- Base = lo que mandó el cliente (respeta cfg/settings/users/payMethods/
  -- etc, que no son resetables), pero los campos resetables se pisan con el
  -- valor actual del servidor — nunca con lo que trae el cliente.
  v_data := p_new_data - v_reset_fields;
  FOREACH v_field IN ARRAY v_reset_fields LOOP
    IF v_server_data ? v_field THEN
      v_data := jsonb_set(v_data, ARRAY[v_field], v_server_data->v_field, true);
    END IF;
  END LOOP;

  -- Decrementar stock server-side por cada ítem vendido, piso duro en 0.
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR i IN 0..(jsonb_array_length(p_items) - 1) LOOP
      v_pid := p_items->i->>'id';
      v_qty := (p_items->i->>'qty')::NUMERIC;
      v_data := jsonb_set(
        v_data, '{products}',
        (
          SELECT jsonb_agg(
            CASE WHEN elem->>'id' = v_pid AND elem->>'stock' IS NOT NULL
                 THEN jsonb_set(elem, '{stock}', to_jsonb(GREATEST(0, (elem->>'stock')::NUMERIC - v_qty)))
                 ELSE elem END
          )
          FROM jsonb_array_elements(v_data->'products') AS elem
        ),
        true
      );
    END LOOP;
  END IF;

  -- Anexar solo las ventas/devoluciones nuevas (unión por id contra lo que
  -- YA hay en el servidor) — la venta de esta transacción nunca se pierde,
  -- sin importar qué tan atrasado esté el resto del payload del cliente.
  v_new_sales := COALESCE((
    SELECT jsonb_agg(elem) FROM jsonb_array_elements(COALESCE(p_new_data->'sales', '[]'::jsonb)) AS elem
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(v_server_data->'sales', '[]'::jsonb)) AS ex
      WHERE ex->>'id' = elem->>'id'
    )
  ), '[]'::jsonb);
  v_new_returns := COALESCE((
    SELECT jsonb_agg(elem) FROM jsonb_array_elements(COALESCE(p_new_data->'returns', '[]'::jsonb)) AS elem
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(v_server_data->'returns', '[]'::jsonb)) AS ex
      WHERE ex->>'id' = elem->>'id'
    )
  ), '[]'::jsonb);

  v_data := v_data || jsonb_build_object(
    'sales',    COALESCE(v_server_data->'sales', '[]'::jsonb) || v_new_sales,
    'returns',  COALESCE(v_server_data->'returns', '[]'::jsonb) || v_new_returns,
    'orderNum', GREATEST(
      COALESCE((v_server_data->>'orderNum')::NUMERIC, 0),
      COALESCE((p_new_data->>'orderNum')::NUMERIC, 0)
    ),
    '_resetAt', v_server_reset_at
  );

  UPDATE pos_data
  SET data       = v_data::text,
      updated_at = NOW(),
      saved_by   = p_device_id
  WHERE license_key = p_license_key;

  RETURN jsonb_build_object('ok', true, 'stale', true, 'reset_at', v_server_reset_at, 'data', v_data);
END;
$$;
