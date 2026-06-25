// 4K POS — posapi Edge Function
// Acciones: activate_license | verify_license | request_license_by_email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { action } = body;

  // ── Activar licencia ──────────────────────────────────────────────────────
  if (action === "activate_license") {
    const { license_key, hardware_id, hostname } = body;
    if (!license_key || !hardware_id) {
      return json({ error: "Faltan campos requeridos" }, 400);
    }

    const { data: lic, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("license_id", license_key.trim().toUpperCase())
      .eq("status", "active")
      .single();

    if (error || !lic) return json({ error: "license_invalid" }, 403);

    if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
      return json({ error: "license_expired" }, 403);
    }

    await supabase
      .from("licenses")
      .update({
        hardware_id,
        hostname: hostname || null,
        activated_at: new Date().toISOString(),
      })
      .eq("license_id", lic.license_id);

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
    const { license_key, hardware_id } = body;
    if (!license_key || !hardware_id) {
      return json({ error: "Faltan campos requeridos" }, 400);
    }

    const { data: lic, error } = await supabase
      .from("licenses")
      .select("plan, status, expires_at, hardware_id")
      .eq("license_id", license_key.trim().toUpperCase())
      .single();

    if (error || !lic) return json({ error: "license_invalid" }, 403);
    if (lic.status !== "active") return json({ error: "license_inactive" }, 403);
    if (lic.hardware_id && lic.hardware_id !== hardware_id) {
      return json({ error: "hardware_mismatch" }, 403);
    }
    if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
      return json({ error: "license_expired" }, 403);
    }

    await supabase
      .from("licenses")
      .update({ last_verified: new Date().toISOString() })
      .eq("license_id", license_key.trim().toUpperCase());

    return json({ ok: true, plan: lic.plan, expires_at: lic.expires_at });
  }

  // ── Solicitar licencia por email ──────────────────────────────────────────
  if (action === "request_license_by_email") {
    const { email, plan } = body;
    if (!email || !email.includes("@")) {
      return json({ error: "Email inválido" }, 400);
    }

    const emailLower = email.toLowerCase().trim();

    // Buscar licencia activa con este email
    const { data: active } = await supabase
      .from("licenses")
      .select("license_id, plan")
      .eq("email", emailLower)
      .eq("status", "active")
      .maybeSingle();

    if (active) {
      return json({ found: true, license_id: active.license_id, plan: active.plan });
    }

    // Verificar si ya hay una solicitud pendiente
    const { data: existing } = await supabase
      .from("licenses")
      .select("license_id")
      .eq("email", emailLower)
      .eq("status", "pending")
      .maybeSingle();

    if (!existing) {
      await supabase.from("licenses").insert({
        license_id: "REQ-" + crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase(),
        email: emailLower,
        plan: plan || "starter",
        status: "pending",
      });
    }

    // Enviar emails via Resend
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
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: emailLower,
            subject: "Tu solicitud de 4K POS fue recibida",
            html: clientHtml,
          }),
        }),
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: ADMIN_EMAIL,
            subject: "Nueva solicitud de licencia 4K POS",
            html: adminHtml,
          }),
        }),
      ]);
    }

    return json({ found: false, pending: true });
  }

  return json({ error: "Acción desconocida" }, 400);
});
