// 4K POS — posapi Edge Function
// Acciones: activate_license | verify_license | request_license_by_email | save | load | commit_sale | reset_data | poll

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function maxDevicesForPlan(plan: string): number {
  const p = (plan || "").toLowerCase();
  if (p.startsWith("pro") || p === "lifetime") return 3;
  return 1;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const url = new URL(req.url);
  const action = (body.action as string) || url.searchParams.get("action") || "";
  const license_key = ((body.license_key as string) || "").trim().toUpperCase();

  // ── Activar licencia ──────────────────────────────────────────────────────
  if (action === "activate_license") {
    const hardware_id = body.hardware_id as string;
    const hostname = (body.hostname as string) || null;
    if (!license_key || !hardware_id) {
      return json({ error: "Faltan campos requeridos" }, 400);
    }

    const { data: lic, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("key", license_key)
      .eq("status", "active")
      .single();

    if (error || !lic) return json({ error: "license_invalid" }, 403);

    if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
      return json({ error: "license_expired" }, 403);
    }

    const { data: existingDev } = await supabase
      .from("license_devices")
      .select("id")
      .eq("license_key", license_key)
      .eq("hardware_id", hardware_id)
      .maybeSingle();

    if (!existingDev) {
      const { count } = await supabase
        .from("license_devices")
        .select("id", { count: "exact", head: true })
        .eq("license_key", license_key);

      const limit = maxDevicesForPlan(lic.plan);
      if ((count ?? 0) >= limit) {
        return json({ error: "device_limit_reached", limit }, 403);
      }

      await supabase.from("license_devices").insert({
        license_key,
        hardware_id,
        hostname,
        registered_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });
    } else {
      await supabase
        .from("license_devices")
        .update({ last_seen: new Date().toISOString(), hostname })
        .eq("id", existingDev.id);
    }

    await supabase
      .from("licenses")
      .update({ device_id: hardware_id, last_seen: new Date().toISOString() })
      .eq("key", license_key);

    return json({
      ok: true,
      plan: lic.plan,
      email: lic.email ?? null,
      business_name: lic.business_name ?? null,
      expires_at: lic.expires_at,
    });
  }

  // ── Verificar licencia ────────────────────────────────────────────────────
  if (action === "verify_license") {
    const hardware_id = body.hardware_id as string;
    if (!license_key || !hardware_id) {
      return json({ error: "Faltan campos requeridos" }, 400);
    }

    const { data: lic, error } = await supabase
      .from("licenses")
      .select("plan, status, expires_at")
      .eq("key", license_key)
      .single();

    if (error || !lic) return json({ error: "license_invalid" }, 403);
    if (lic.status !== "active") return json({ error: "license_inactive" }, 403);

    const { data: dev } = await supabase
      .from("license_devices")
      .select("id")
      .eq("license_key", license_key)
      .eq("hardware_id", hardware_id)
      .maybeSingle();

    if (!dev) return json({ error: "hardware_mismatch" }, 403);

    if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
      return json({ error: "license_expired" }, 403);
    }

    await Promise.allSettled([
      supabase.from("licenses").update({ last_seen: new Date().toISOString() }).eq("key", license_key),
      supabase.from("license_devices").update({ last_seen: new Date().toISOString() }).eq("id", dev.id),
    ]);

    return json({ ok: true, plan: lic.plan, expires_at: lic.expires_at });
  }

  // ── Solicitar licencia por email ──────────────────────────────────────────
  if (action === "request_license_by_email") {
    const email = body.email as string;
    const plan = body.plan as string;
    if (!email || !email.includes("@")) {
      return json({ error: "Email inválido" }, 400);
    }

    const emailLower = email.toLowerCase().trim();

    const { data: active } = await supabase
      .from("licenses")
      .select("key, plan")
      .eq("email", emailLower)
      .eq("status", "active")
      .maybeSingle();

    if (active) {
      return json({ found: true, license_id: active.key, plan: active.plan });
    }

    const { data: existing } = await supabase
      .from("licenses")
      .select("key")
      .eq("email", emailLower)
      .eq("status", "pending")
      .maybeSingle();

    if (!existing) {
      await supabase.from("licenses").insert({
        key: "REQ-" + crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase(),
        email: emailLower,
        plan: plan || "starter",
        status: "pending",
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "kelvin-2101@hotmail.com";

    if (RESEND_API_KEY) {
      const clientHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f4f4f8;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
    <div style="background:#0a0a0f;padding:28px 32px;text-align:center">
      <div style="display:inline-flex;align-items:center;gap:10px">
        <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#00d4ff,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;letter-spacing:-1px">4K</div>
        <span style="color:#fff;font-size:19px;font-weight:700">4K POS</span>
      </div>
    </div>
    <div style="padding:32px">
      <h2 style="font-size:18px;color:#111;margin:0 0 14px">Tu solicitud fue recibida ✓</h2>
      <p style="color:#444;line-height:1.65;margin:0 0 14px">
        Hemos recibido tu solicitud de licencia para <strong>4K POS</strong>.<br>
        En breve recibirás tu código de activación por este mismo correo.
      </p>
      <p style="color:#444;line-height:1.65;margin:0 0 24px">
        ¿Tienes preguntas? Escríbenos:<br>
        <a href="mailto:soporte@4kpos.com" style="color:#00d4ff;text-decoration:none">soporte@4kpos.com</a>
      </p>
      <div style="background:#f8f9fb;border-radius:8px;padding:14px 16px;font-size:12px;color:#888;line-height:1.5">
        Este mensaje fue generado porque solicitaste una licencia desde la aplicación 4K POS.<br>
        Si no fuiste tú, puedes ignorarlo.
      </div>
    </div>
  </div>
</body>
</html>`;

      const adminHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;padding:24px;color:#222">
  <h2 style="margin:0 0 16px">🆕 Nueva solicitud de licencia — 4K POS</h2>
  <table style="border-collapse:collapse;font-size:14px">
    <tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap">Email:</td><td style="padding:6px 0"><strong>${emailLower}</strong></td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#666">Plan:</td><td style="padding:6px 0">${plan || "starter"}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#666">Fecha:</td><td style="padding:6px 0">${new Date().toISOString()}</td></tr>
  </table>
</body>
</html>`;

      await Promise.allSettled([
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: "onboarding@resend.dev", to: emailLower, subject: "Tu solicitud de 4K POS fue recibida", html: clientHtml }),
        }),
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: "onboarding@resend.dev", to: ADMIN_EMAIL, subject: "Nueva solicitud de licencia 4K POS", html: adminHtml }),
        }),
      ]);
    }

    return json({ found: false, pending: true });
  }

  // ── Guardar datos POS ─────────────────────────────────────────────────────
  if (action === "save") {
    if (!license_key) return json({ error: "license_key required" }, 400);

    const { data: lic } = await supabase
      .from("licenses")
      .select("key")
      .eq("key", license_key)
      .eq("status", "active")
      .single();

    if (!lic) return json({ error: "license_invalid" }, 403);

    const incoming = (body.data as Record<string, unknown>) || {};
    const device_id = (body.device_id as string) || "";

    // Merge sales + returns append-only: nunca descartar registros de otra PC
    let mergedSales = (incoming.sales as unknown[]) || [];
    let mergedReturns = (incoming.returns as unknown[]) || [];
    const { data: existing } = await supabase
      .from("pos_data").select("data").eq("license_key", license_key).single();
    if (existing?.data) {
      const ex = existing.data as Record<string, unknown>;
      const exSales = (ex.sales as unknown[]) || [];
      const inSaleIds = new Set(mergedSales.map((s) => String((s as Record<string, unknown>).id)));
      for (const s of exSales) {
        if (!inSaleIds.has(String((s as Record<string, unknown>).id))) mergedSales.push(s);
      }
      const exRets = (ex.returns as unknown[]) || [];
      const inRetIds = new Set(mergedReturns.map((r) => String((r as Record<string, unknown>).id)));
      for (const r of exRets) {
        if (!inRetIds.has(String((r as Record<string, unknown>).id))) mergedReturns.push(r);
      }
    }

    const dataToSave = { ...incoming, sales: mergedSales, returns: mergedReturns };

    // saved_by en el UPSERT (no en UPDATE separado) → evento Realtime lleva saved_by correcto
    const { error: upsertErr } = await supabase
      .from("pos_data")
      .upsert(
        { license_key, data: dataToSave, updated_at: new Date().toISOString(), saved_by: device_id },
        { onConflict: "license_key" }
      );

    if (upsertErr) return json({ error: upsertErr.message }, 500);
    return json({ success: true });
  }

  // ── Cargar datos POS ──────────────────────────────────────────────────────
  if (action === "load") {
    if (!license_key) return json({ error: "license_key required" }, 400);

    const { data: lic } = await supabase
      .from("licenses")
      .select("key")
      .eq("key", license_key)
      .eq("status", "active")
      .single();

    if (!lic) return json({ error: "license_invalid" }, 403);

    const { data: posRow } = await supabase
      .from("pos_data")
      .select("data, updated_at")
      .eq("license_key", license_key)
      .single();

    // Supabase Deno client devuelve JSONB como string preserializado → parsear antes de embeber
    const rawData = posRow?.data ?? null;
    const parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    return json({
      success: true,
      data: parsedData,
      updated_at: posRow?.updated_at ?? null,
    });
  }

  // ── Commit atómico con validación de stock ────────────────────────────────
  if (action === "commit_sale") {
    if (!license_key) return json({ error: "license_key required" }, 400);

    const { data: lic } = await supabase
      .from("licenses").select("key").eq("key", license_key).eq("status", "active").single();
    if (!lic) return json({ error: "license_invalid" }, 403);

    const { data: result, error: rpcErr } = await supabase.rpc("pos_commit_sale", {
      p_license_key: license_key,
      p_items: body.items ?? [],
      p_new_data: body.data,
      p_device_id: (body.device_id as string) || "",
    });

    if (rpcErr) return json({ ok: false, error: rpcErr.message }, 500);
    return json(result);
  }

  // ── Reset total de datos (atómico) ─────────────────────────────────────────
  // El cliente ya valida keyword+password+countdown en su UI, pero eso es
  // solo UX — la identidad real (usuario admin + password) se re-valida acá
  // contra el hash bcrypt guardado en pos_data.data.users, para no confiar
  // ciegamente en lo que mande el frontend.
  if (action === "reset_data") {
    if (!license_key) return json({ error: "license_key required" }, 400);

    const { data: lic } = await supabase
      .from("licenses").select("key").eq("key", license_key).eq("status", "active").single();
    if (!lic) return json({ error: "license_invalid" }, 403);

    const username = ((body.user as string) || "").trim();
    const password = (body.password as string) || "";
    if (!username || !password) {
      return json({ ok: false, error: "missing_credentials" }, 400);
    }

    const { data: posRow, error: posErr } = await supabase
      .from("pos_data").select("data").eq("license_key", license_key).single();
    if (posErr || !posRow) return json({ ok: false, error: "pos_data_not_found" }, 404);

    const rawData = posRow.data;
    const currentData = (typeof rawData === "string" ? JSON.parse(rawData) : rawData) ?? {};
    const users = (currentData.users as Array<Record<string, unknown>>) || [];
    const foundUser = users.find((u) =>
      (u.user as string) === username || (u.name as string) === username
    );

    if (!foundUser || foundUser.role !== "admin") {
      return json({ ok: false, error: "not_admin" }, 403);
    }
    const passHash = (foundUser.pass as string) || "";
    if (!passHash || !bcrypt.compareSync(password, passHash)) {
      return json({ ok: false, error: "invalid_credentials" }, 403);
    }

    const targets = Array.isArray(body.targets) ? (body.targets as string[]) : [];
    const executorLabel = `${(foundUser.name as string) || username} (${(foundUser.user as string) || (foundUser.id as string) || username})`;

    const { data: result, error: rpcErr } = await supabase.rpc("pos_reset_data", {
      p_license_key: license_key,
      p_targets: targets,
      p_user: executorLabel,
    });

    if (rpcErr) {
      // No tragarse el error: loguearlo completo en los logs de la Edge
      // Function (Supabase Dashboard → Edge Functions → Logs) y devolver
      // message/details/hint/code al cliente para diagnóstico.
      console.error("[reset_data] pos_reset_data RPC error:", JSON.stringify(rpcErr));
      return json({
        ok: false,
        error: rpcErr.message,
        details: rpcErr.details ?? null,
        hint: rpcErr.hint ?? null,
        code: rpcErr.code ?? null,
      }, 500);
    }
    return json(result);
  }

  // ── Poll liviano para sincronización entre PCs ────────────────────────────
  if (action === "poll") {
    if (!license_key) return json({ error: "license_key required" }, 400);

    const { data: lic } = await supabase
      .from("licenses").select("key").eq("key", license_key).eq("status", "active").single();
    if (!lic) return json({ error: "license_invalid" }, 403);

    // Try with saved_by first; fall back if column doesn't exist yet
    const { data: row, error: rowErr } = await supabase
      .from("pos_data").select("updated_at, saved_by").eq("license_key", license_key).single();
    if (rowErr) {
      const { data: row2 } = await supabase
        .from("pos_data").select("updated_at").eq("license_key", license_key).single();
      return json({ updated_at: row2?.updated_at ?? null, saved_by: null });
    }
    return json({ updated_at: row?.updated_at ?? null, saved_by: (row as any)?.saved_by ?? null });
  }

  return json({ error: "Acción desconocida" }, 400);
});
