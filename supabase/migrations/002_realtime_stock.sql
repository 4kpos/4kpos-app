-- ── 1. Columna saved_by (identifica qué PC hizo el último save) ──────────────
ALTER TABLE pos_data
  ADD COLUMN IF NOT EXISTS saved_by TEXT DEFAULT '';

-- ── 2. Función de commit atómico con validación de stock ──────────────────────
-- Llamada desde posapi acción commit_sale al finalizar cada venta.
-- Usa FOR UPDATE para garantizar exclusión mutua entre PCs concurrentes:
-- el segundo PC espera el lock hasta que el primero termine.
CREATE OR REPLACE FUNCTION pos_commit_sale(
  p_license_key TEXT,
  p_items       JSONB,          -- [{id, qty, name}]  ← expandido del carrito
  p_new_data    JSONB,          -- _buildSlim() con stock ya decrementado
  p_device_id   TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_row     pos_data%ROWTYPE;
  v_product JSONB;
  v_stock   NUMERIC;
  v_qty     NUMERIC;
  v_pid     TEXT;
  v_name    TEXT;
BEGIN
  -- Bloquear la fila para exclusión mutua: el segundo PC espera aquí
  -- hasta que el primero complete el UPSERT final.
  SELECT * INTO v_row
  FROM pos_data
  WHERE license_key = p_license_key
  FOR UPDATE;

  -- Si hay fila y hay ítems, validar stock contra datos actuales del servidor
  IF FOUND AND p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR i IN 0..(jsonb_array_length(p_items) - 1) LOOP
      v_pid  := p_items->i->>'id';
      v_qty  := (p_items->i->>'qty')::NUMERIC;
      v_name := COALESCE(p_items->i->>'name', v_pid);

      -- Buscar el producto en los datos actuales del servidor
      SELECT elem INTO v_product
      FROM jsonb_array_elements(v_row.data->'products') AS elem
      WHERE elem->>'id' = v_pid
      LIMIT 1;

      -- Producto no encontrado en servidor: puede ser nuevo, se deja pasar
      IF v_product IS NULL THEN CONTINUE; END IF;

      -- stock NULL o ausente = sin límite, se ignora
      IF v_product->>'stock' IS NULL THEN CONTINUE; END IF;

      v_stock := (v_product->>'stock')::NUMERIC;

      IF v_stock < v_qty THEN
        RETURN jsonb_build_object(
          'ok',        false,
          'error',     'stock_insuficiente',
          'product',   v_name,
          'needed',    v_qty,
          'available', v_stock
        );
      END IF;
    END LOOP;
  END IF;

  -- Todo OK (o primera vez sin fila) → guardar de forma atómica
  INSERT INTO pos_data (license_key, data, updated_at, saved_by)
  VALUES (p_license_key, p_new_data, NOW(), p_device_id)
  ON CONFLICT (license_key) DO UPDATE
    SET data       = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at,
        saved_by   = EXCLUDED.saved_by;

  RETURN jsonb_build_object('ok', true);
END;
$$;
