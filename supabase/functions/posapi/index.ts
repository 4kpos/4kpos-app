// 4K POS — posapi Edge Function v3
// Columnas reales: key, status, device_id, plan, expires_at, business_name, email, created_at, last_seen

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function genKey() {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const s = () => Array.from({length:4}, () => c[Math.floor(Math.random()*c.length)]).join("");
  return "4K-" + s() + "-" + s() + "-" + s();
}

function dolr(n) { return "$" + Number(n||0).toFixed(2); }
function timeAgo(iso) {
  if(!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000);
  if(m<1) return "hace un momento";
  if(m<60) return "hace " + m + " min";
  const h = Math.floor(m/60);
  if(h<24) return "hace " + h + "h";
  return "hace " + Math.floor(h/24) + "d";
}

function dashboardHTML(d) {
  const prodMap = {};
  (d.today.sales||[]).forEach((s) => {
    (s.items||[]).forEach((i) => {
      if(!prodMap[i.name]) prodMap[i.name]={qty:0,total:0};
      prodMap[i.name].qty+=i.qty;
      prodMap[i.name].total+=i.price*i.qty;
    });
  });
  const prods = Object.entries(prodMap).sort((a,b)=>b[1].total-a[1].total);
  const maxTotal = prods.length ? prods[0][1].total : 1;
  const avg = d.today.sales_count > 0 ? d.today.total/d.today.sales_count : 0;

  const salesRows = (d.today.sales||[]).length === 0
    ? '<div style="text-align:center;padding:20px;color:rgba(255,255,255,.3)">Sin ventas hoy</div>'
    : [...(d.today.sales||[])].reverse().map((s) => {
        const items = (s.items||[]).map((i)=>i.name+(i.qty>1?" x"+i.qty:"")).join(", ");
        const time = new Date(s.date).toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"});
        return '<div style="background:#1a1a22;border:1.5px solid rgba(255,255,255,.09);border-radius:10px;padding:11px 13px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:.72rem;color:#a78bfa;font-weight:600;margin-bottom:2px">Orden #'+(s.rnum||s.id)+'</div><div style="font-size:.82rem;color:rgba(255,255,255,.7)">'+items+'</div><div style="font-size:.7rem;color:rgba(255,255,255,.35);margin-top:2px">'+time+'</div></div><div style="font-family:monospace;font-size:.95rem;font-weight:700;color:#34d399">'+dolr(s.total)+'</div></div>';
      }).join("");

  const prodBars = prods.map(([name,v]) =>
    '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:.74rem;color:rgba(255,255,255,.6);margin-bottom:3px"><span>'+name+'</span><span>'+dolr(v.total)+' ('+v.qty+'u)</span></div><div style="height:7px;background:rgba(255,255,255,.08);border-radius:4px"><div style="height:100%;width:'+Math.round(v.total/maxTotal*100)+'%;border-radius:4px;background:linear-gradient(90deg,#7c3aed,#a78bfa)"></div></div></div>'
  ).join("");

  const lowRows = (d.low_stock||[]).map((p) =>
    '<div style="background:#1a1a22;border:1.5px solid rgba(248,113,113,.3);border-radius:10px;padding:11px 13px;margin-bottom:8px;display:flex;justify-content:space-between"><span style="font-size:.84rem;font-weight:600">'+p.name+'</span><span style="color:#f87171;font-weight:600">'+p.stock+' restantes</span></div>'
  ).join("");

  const currentUrl = "https://izalnhluwtyotuxwkqrh.supabase.co/functions/v1/posapi?action=dashboard&key=" + (d.key||"");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>4K POS - ${d.business_name||"Dashboard"}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f13;color:#fff;}</style>
</head>
<body>
<div style="background:linear-gradient(135deg,#1a0533,#2d0a5e);padding:20px 16px 24px;text-align:center">
  <div style="font-size:1.3rem;font-weight:800"><span style="color:#1e3a8a">4K</span> <span style="color:#1a7a3a">P</span><span style="color:#e6b800">O</span><span style="color:#cc1111">S</span></div>
  <div style="font-size:1rem;color:rgba(255,255,255,.7);margin:4px 0">${d.business_name||"Mi Negocio"}</div>
  <div style="font-size:.72rem;color:rgba(255,255,255,.35)">${timeAgo(d.updated_at)}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px">
  <div style="background:rgba(52,211,153,.08);border:1.5px solid rgba(52,211,153,.3);border-radius:12px;padding:14px">
    <div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.8px;color:#34d399;margin-bottom:5px">💰 Ingresos hoy</div>
    <div style="font-family:monospace;font-size:1.4rem;font-weight:700;color:#34d399">${dolr(d.today.total)}</div>
    <div style="font-size:.72rem;opacity:.5;margin-top:3px">${d.today.sales_count} órdenes</div>
  </div>
  <div style="background:rgba(167,139,250,.08);border:1.5px solid rgba(167,139,250,.3);border-radius:12px;padding:14px">
    <div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.8px;color:#a78bfa;margin-bottom:5px">🛒 Órdenes</div>
    <div style="font-family:monospace;font-size:1.4rem;font-weight:700;color:#a78bfa">${d.today.sales_count}</div>
    <div style="font-size:.72rem;opacity:.5;margin-top:3px">Promedio ${dolr(avg)}</div>
  </div>
  <div style="background:rgba(251,191,36,.08);border:1.5px solid rgba(251,191,36,.3);border-radius:12px;padding:14px">
    <div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.8px;color:#fbbf24;margin-bottom:5px">📦 Productos</div>
    <div style="font-family:monospace;font-size:1.4rem;font-weight:700;color:#fbbf24">${d.products_count||0}</div>
    <div style="font-size:.72rem;opacity:.5;margin-top:3px">en catálogo</div>
  </div>
  <div style="background:rgba(248,113,113,.08);border:1.5px solid rgba(248,113,113,.3);border-radius:12px;padding:14px">
    <div style="font-size:.68rem;text-transform:uppercase;letter-spacing:.8px;color:#f87171;margin-bottom:5px">⚠️ Stock bajo</div>
    <div style="font-family:monospace;font-size:1.4rem;font-weight:700;color:#f87171">${(d.low_stock||[]).length}</div>
    <div style="font-size:.72rem;opacity:.5;margin-top:3px">productos</div>
  </div>
</div>
${prods.length>0?`<div style="padding:0 16px 16px"><div style="font-size:.78rem;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.4);margin-bottom:10px">📊 Ventas por producto</div><div style="background:#1a1a22;border:1.5px solid rgba(255,255,255,.09);border-radius:12px;padding:14px">${prodBars}</div></div>`:""}
<div style="padding:0 16px 16px">
  <div style="font-size:.78rem;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.4);margin-bottom:10px">🧾 Ventas de hoy</div>
  ${salesRows}
</div>
${lowRows?`<div style="padding:0 16px 16px"><div style="font-size:.78rem;text-transform:uppercase;letter-spacing:.8px;color:rgba(255,255,255,.4);margin-bottom:10px">⚠️ Stock bajo</div>${lowRows}</div>`:""}
<div style="padding:0 16px 20px">
  <a href="${currentUrl}" style="display:block;background:linear-gradient(135deg,#7c3aed,#a78bfa);border-radius:10px;color:#fff;padding:13px;font-size:.9rem;font-weight:700;text-align:center;text-decoration:none">🔄 Actualizar</a>
</div>
<div style="text-align:center;font-size:.7rem;color:rgba(255,255,255,.2);padding-bottom:20px">4K POS Dashboard</div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const qAction = url.searchParams.get("action") || "";
  const qKey = url.searchParams.get("key") || "";

  const sb = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const okR = (data) => Response.json({ success: true, ...data }, { headers: CORS });
  const errR = (msg, code = 400) => Response.json({ success: false, error: msg }, { status: code, headers: CORS });

  // Parse body for POST; GET uses query params only
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    body = await req.json().catch(() => ({}));
  }

  const action = ((body.action as string) || qAction).toLowerCase();
  // Support license_key (old field name) and key
  const licenseKey = ((body.license_key as string) || (body.key as string) || qKey || "").trim().toUpperCase();

  // HEALTH CHECK
  if (!action) return Response.json({ success: true, status: "ok", app: "4K POS API v3" }, { headers: CORS });

  // ── DASHBOARD HTML ─────────────────────────────────────────────────────────
  if (action === "dashboard") {
    if (!licenseKey) return new Response("Falta la clave de licencia", { status: 400 });
    const { data: lic } = await sb.from("licenses").select("*").eq("key", licenseKey).single();
    if (!lic) return new Response("Licencia inválida", { status: 404 });
    const { data: pd } = await sb.from("pos_data").select("data,updated_at").eq("license_key", licenseKey).single();
    if (!pd) {
      const empty = { key: licenseKey, business_name: lic.business_name, updated_at: null, today: { sales_count: 0, total: 0, sales: [] }, products_count: 0, low_stock: [] };
      return new Response(dashboardHTML(empty), { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
    }
    const parsed = typeof pd.data === "string" ? JSON.parse(pd.data) : pd.data;
    const today = new Date().toDateString();
    const ts = (parsed.sales||[]).filter((s) => new Date(s.date).toDateString()===today && s.status==="active");
    const dashData = { key: licenseKey, business_name: lic.business_name, updated_at: pd.updated_at, today: { sales_count: ts.length, total: ts.reduce((s,x)=>s+x.total,0), sales: ts }, products_count: (parsed.products||[]).length, low_stock: (parsed.products||[]).filter((p)=>p.stock<=3) };
    return new Response(dashboardHTML(dashData), { headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });
  }

  // ── ACTIVATE LICENSE ───────────────────────────────────────────────────────
  if (action === "activate_license") {
    const hardware_id = body.hardware_id as string;
    if (!licenseKey || !hardware_id) return errR("Faltan campos requeridos");
    const { data: lic, error } = await sb.from("licenses").select("*").eq("key", licenseKey).single();
    if (error || !lic) return Response.json({ error: "license_invalid" }, { status: 403, headers: CORS });
    if (lic.status !== "active") return Response.json({ error: "license_inactive" }, { status: 403, headers: CORS });
    if (lic.expires_at && new Date(lic.expires_at) < new Date()) return Response.json({ error: "license_expired" }, { status: 403, headers: CORS });
    // Register device if not set
    if (!lic.device_id) {
      await sb.from("licenses").update({ device_id: hardware_id, last_seen: new Date().toISOString() }).eq("key", licenseKey);
    } else {
      await sb.from("licenses").update({ last_seen: new Date().toISOString() }).eq("key", licenseKey);
    }
    return Response.json({ ok: true, plan: lic.plan, email: lic.email ?? null, business_name: lic.business_name ?? null, expires_at: lic.expires_at ?? null }, { headers: CORS });
  }

  // ── VERIFY LICENSE ─────────────────────────────────────────────────────────
  if (action === "verify_license") {
    if (!licenseKey) return errR("license_key required");
    const { data: lic, error } = await sb.from("licenses").select("plan,status,expires_at").eq("key", licenseKey).single();
    if (error || !lic) return Response.json({ error: "license_invalid" }, { status: 403, headers: CORS });
    if (lic.status !== "active") return Response.json({ error: "license_inactive" }, { status: 403, headers: CORS });
    if (lic.expires_at && new Date(lic.expires_at) < new Date()) return Response.json({ error: "license_expired" }, { status: 403, headers: CORS });
    await sb.from("licenses").update({ last_seen: new Date().toISOString() }).eq("key", licenseKey);
    return Response.json({ ok: true, plan: lic.plan, expires_at: lic.expires_at ?? null }, { headers: CORS });
  }

  // ── CREATE LICENSE (admin) ─────────────────────────────────────────────────
  if (action === "create_license") {
    const { email, business_name, plan } = body;
    if (!email || !plan) return errR("Email and plan required");
    const k = genKey();
    const p = (plan as string).toLowerCase();
    const expires_at = p.includes("monthly") ? new Date(Date.now() + 30*24*60*60*1000).toISOString()
      : p.includes("annual") ? new Date(Date.now() + 365*24*60*60*1000).toISOString()
      : null;
    const { error } = await sb.from("licenses").insert({ key: k, email, business_name, plan, status: "active", expires_at, created_at: new Date().toISOString() });
    if (error) return errR(error.message, 500);
    return okR({ key: k, expires_at, plan });
  }

  // ── SAVE DATA ──────────────────────────────────────────────────────────────
  if (action === "save") {
    if (!licenseKey) return errR("license_key required");
    const dataToSave = body.data;
    if (dataToSave === undefined) return errR("data required");
    const { data: lic } = await sb.from("licenses").select("status").eq("key", licenseKey).single();
    if (!lic || lic.status !== "active") return errR("Invalid license", 403);
    const serialized = typeof dataToSave === "string" ? dataToSave : JSON.stringify(dataToSave);
    const { error } = await sb.from("pos_data").upsert({ license_key: licenseKey, data: serialized, updated_at: new Date().toISOString() }, { onConflict: "license_key" });
    if (error) return errR(error.message, 500);
    return okR({ synced_at: new Date().toISOString() });
  }

  // ── LOAD DATA ──────────────────────────────────────────────────────────────
  if (action === "load") {
    if (!licenseKey) return errR("Key required");
    const { data: lic } = await sb.from("licenses").select("status").eq("key", licenseKey).single();
    if (!lic || lic.status !== "active") return errR("Invalid license", 403);
    const { data } = await sb.from("pos_data").select("data,updated_at").eq("license_key", licenseKey).single();
    if (!data) return okR({ data: null });
    const parsed = typeof data.data === "string" ? JSON.parse(data.data) : data.data;
    return okR({ data: parsed, updated_at: data.updated_at });
  }

  return errR("Not found", 404);
});
