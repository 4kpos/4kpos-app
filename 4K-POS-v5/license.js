// ============================================================
// 4K POS v5 — license.js
// ============================================================

const { app } = require('electron')
const os = require('os')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const API_URL = 'https://izalnhluwtyotuxwkqrh.supabase.co/functions/v1/posapi'
const LICENSE_FILE = path.join(app.getPath('userData'), '4kpos_license.json')

// Días de gracia sin internet antes de bloquear
const OFFLINE_GRACE_DAYS = 15

// ── Anti-manipulación de reloj ──────────────────────────────
// El tiempo transcurrido offline ya no se calcula como
// `Date.now() - last_verified` (confía ciegamente en el reloj del sistema,
// que el usuario controla). En su lugar se usa os.uptime() — equivalente
// a GetTickCount64/Environment.TickCount64 — que no se ve afectado por
// cambios manuales de fecha/hora y solo se reinicia al reiniciar el equipo.
const CLOCK_STATE_FILE = path.join(app.getPath('userData'), '4kpos_clock_state.json')
const CLOCK_TAMPER_LOG = path.join(app.getPath('userData'), '4kpos_clock_tamper.log')
const CLOCK_TOLERANCE_MS = 10 * 60 * 1000       // margen para NTP/DST (10 min)
const MAX_PLAUSIBLE_JUMP_MS = 24 * 60 * 60 * 1000 // salto máximo aceptado por sesión (24h)

// Secreto para validar códigos de extensión offline.
// Este valor es un placeholder: GitHub Actions lo reemplaza en build time
// con el valor del GitHub Secret EXT_CODE_SECRET.
// NUNCA escribas el valor real aquí.
// En dev: $env:EXT_CODE_SECRET = "secreto"; npx electron .
const EXT_CODE_SECRET = (() => {
  const baked = '__EXT_CODE_SECRET__'
  return baked !== '__EXT_CODE_SECRET__' ? baked : (process.env.EXT_CODE_SECRET || '__EXT_CODE_SECRET__')
})()

// Alfabeto sin caracteres ambiguos (0/O, 1/I/L)
const EXT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// ── Hardware ID ────────────────────────────────────────────
function generateHardwareId() {
  const data = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus().length,
    os.cpus()[0]?.model || '',
    Math.round(os.totalmem() / (1024 * 1024 * 1024)),
  ].join('|')
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32)
}

// ── Estado de reloj firmado (anti-rollback) ─────────────────
function _clockStateKey() {
  return crypto.createHash('sha256')
    .update(generateHardwareId() + ':clockstate:' + EXT_CODE_SECRET)
    .digest()
}

function _signClockState(data) {
  const sig = crypto.createHmac('sha256', _clockStateKey()).update(JSON.stringify(data)).digest('hex')
  return { data, sig }
}

function _readClockState() {
  try {
    if (!fs.existsSync(CLOCK_STATE_FILE)) return null
    const parsed = JSON.parse(fs.readFileSync(CLOCK_STATE_FILE, 'utf8'))
    if (!parsed || !parsed.data || !parsed.sig) return { valid: false }
    const expectedSig = crypto.createHmac('sha256', _clockStateKey()).update(JSON.stringify(parsed.data)).digest('hex')
    if (expectedSig !== parsed.sig) return { valid: false }
    return { valid: true, data: parsed.data }
  } catch(e) {
    return { valid: false }
  }
}

function _writeClockState(data) {
  try { fs.writeFileSync(CLOCK_STATE_FILE, JSON.stringify(_signClockState(data)), 'utf8') } catch(e) {}
}

function _logClockTamper(reason, info) {
  try {
    fs.appendFileSync(CLOCK_TAMPER_LOG, new Date().toISOString() + '  ' + reason + '  ' + JSON.stringify(info || {}) + '\n')
  } catch(e) {}
}

// Acumula el tiempo "de confianza" transcurrido desde la última verificación
// exitosa contra el servidor, cruzando el delta del reloj de pared con el
// delta de os.uptime() (inmune a cambios de fecha). Si el reloj de pared
// retrocede, o avanza mucho más que el uptime real de la máquina, el salto
// se descarta o se limita en vez de aceptarse como válido.
// `resetOnSuccess=true` reinicia el contador (se llama tras verificar online).
function _accrueClockState(resetOnSuccess) {
  const nowWallMs = Date.now()
  const nowUptimeS = os.uptime()
  const prev = _readClockState()

  let accrued = 0
  let tamperCount = 0
  let tampered = false
  let reason = null
  let ceilingWallMs = nowWallMs
  let ceilingUptimeS = nowUptimeS

  if (prev && !prev.valid) {
    // El archivo existe pero la firma no coincide (editado a mano) — se
    // descarta el estado previo y se registra el intento, pero no se bloquea.
    tampered = true; reason = 'invalid_state_file'
    tamperCount = 1
    _logClockTamper(reason, { nowWallMs })
  } else if (prev && prev.valid && prev.data) {
    const d = prev.data
    accrued = d.accrued_offline_ms || 0
    tamperCount = d.tamper_count || 0
    const wallDelta = nowWallMs - d.wall_ceiling_ms
    const sameBoot = nowUptimeS >= d.uptime_s_at_ceiling
    const uptimeDeltaMs = sameBoot ? (nowUptimeS - d.uptime_s_at_ceiling) * 1000 : null

    if (wallDelta < -CLOCK_TOLERANCE_MS) {
      // El reloj retrocedió respecto al máximo visto — no se acredita tiempo
      // y el techo (ceiling) no baja, para que no se pueda "congelar" en un
      // punto favorable retrocediendo una y otra vez.
      tampered = true; reason = 'rollback'
      ceilingWallMs = d.wall_ceiling_ms
      ceilingUptimeS = nowUptimeS
    } else if (sameBoot && (wallDelta - uptimeDeltaMs) > MAX_PLAUSIBLE_JUMP_MS) {
      // Mismo arranque de Windows (uptime no se reinició) pero el reloj de
      // pared saltó mucho más de lo que el uptime real permite — se acredita
      // el uptime real más un margen razonable, no el salto completo.
      tampered = true; reason = 'forward_jump'
      accrued += Math.min(wallDelta, uptimeDeltaMs + MAX_PLAUSIBLE_JUMP_MS)
      ceilingWallMs = Math.max(d.wall_ceiling_ms, nowWallMs)
      ceilingUptimeS = nowUptimeS
    } else {
      accrued += Math.max(0, wallDelta)
      ceilingWallMs = Math.max(d.wall_ceiling_ms, nowWallMs)
      ceilingUptimeS = nowUptimeS
    }

    if (tampered) {
      tamperCount++
      _logClockTamper(reason, { nowWallMs, prevCeiling: d.wall_ceiling_ms, tamperCount })
    }
  }

  if (resetOnSuccess) accrued = 0

  _writeClockState({
    wall_ceiling_ms: ceilingWallMs,
    uptime_s_at_ceiling: ceilingUptimeS,
    accrued_offline_ms: accrued,
    tamper_count: tamperCount,
  })

  return { tampered, reason, accruedOfflineMs: accrued, tamperCount }
}

// ── Licencia local ─────────────────────────────────────────
function readLocalLicense() {
  try {
    if (fs.existsSync(LICENSE_FILE)) return JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'))
  } catch(e) {}
  return null
}

function saveLocalLicense(data) {
  try { fs.writeFileSync(LICENSE_FILE, JSON.stringify(data, null, 2), 'utf8') } catch(e) {}
}

function clearLocalLicense() {
  try { if (fs.existsSync(LICENSE_FILE)) fs.unlinkSync(LICENSE_FILE) } catch(e) {}
}

// ── Código de dispositivo ──────────────────────────────────
// Deriva un código corto estable a partir del hardware_id + license key.
// Cambia solo si el hardware o la licencia cambian.
function getDeviceCode(local) {
  const input = (local.hardware_id || '') + '|' + (local.key || '')
  const hash = crypto.createHash('sha256').update(input).digest()
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += EXT_CODE_ALPHABET[hash[i] % EXT_CODE_ALPHABET.length]
  }
  return code
}

// ── ISO week helper ────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// ── Generación interna de código de extensión ──────────────
function _generateExtCodeForWeek(deviceCode, weekStr) {
  const hmac = crypto.createHmac('sha256', EXT_CODE_SECRET)
  hmac.update(deviceCode.toUpperCase() + ':' + weekStr)
  const digest = hmac.digest()
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += EXT_CODE_ALPHABET[digest[i] % EXT_CODE_ALPHABET.length]
  }
  return code
}

// ── Validación de código de extensión ─────────────────────
// Acepta códigos de la semana actual y de la semana anterior
// (margen para semanas que empiezan el lunes pero el cliente lo activa el domingo).
function validateExtensionCode(deviceCode, extensionCode) {
  if (!EXT_CODE_SECRET || EXT_CODE_SECRET === '__EXT_CODE_SECRET__') return false
  const now = new Date()
  const weeksToCheck = [
    getISOWeek(now),
    getISOWeek(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
  ]
  const candidate = extensionCode.toUpperCase().trim()
  for (const week of weeksToCheck) {
    if (_generateExtCodeForWeek(deviceCode.toUpperCase(), week) === candidate) return true
  }
  return false
}

// ── Extensión de gracia offline ────────────────────────────
function extendLicenseOffline(deviceCode, extensionCode) {
  const local = readLocalLicense()
  if (!local) return { ok: false, error: 'No hay licencia guardada en este equipo.' }
  if (!validateExtensionCode(deviceCode, extensionCode)) {
    return { ok: false, error: 'Código de extensión inválido o expirado.' }
  }
  local.last_verified = new Date().toISOString()
  saveLocalLicense(local)
  _accrueClockState(true) // extensión autorizada: reinicia el contador de gracia offline
  return { ok: true }
}

// ── Activación ─────────────────────────────────────────────
async function activateLicense(licenseKey) {
  const hardwareId = generateHardwareId()
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'activate_license',
        license_key: licenseKey.trim().toUpperCase(),
        hardware_id: hardwareId,
        hostname: os.hostname(),
      }),
    })
    const json = await res.json()
    if (!res.ok || json.error) return { ok: false, error: json.error || 'Error de activación' }

    const local = {
      key: licenseKey.trim().toUpperCase(),
      hardware_id: hardwareId,
      plan: json.plan,
      business_name: json.business_name,
      email: json.email,
      expires_at: json.expires_at,
      activated_at: new Date().toISOString(),
      last_verified: new Date().toISOString(),
    }
    saveLocalLicense(local)
    _accrueClockState(true) // activación confirmada por el servidor: baseline limpio
    return { ok: true, license: local }
  } catch(e) {
    return { ok: false, error: 'Sin conexión. Verifica tu internet e intenta de nuevo.' }
  }
}

// ── Verificación al arrancar (online o modo offline hasta OFFLINE_GRACE_DAYS) ──
async function verifyLicense() {
  const local = readLocalLicense()
  if (!local) return { valid: false, reason: 'no_license' }

  const hardwareId = generateHardwareId()
  if (local.hardware_id !== hardwareId) {
    clearLocalLicense()
    return { valid: false, reason: 'hardware_mismatch' }
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_license',
        license_key: local.key,
        hardware_id: hardwareId,
      }),
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      clearLocalLicense()
      return { valid: false, reason: json.error || 'license_invalid' }
    }
    local.last_verified = new Date().toISOString()
    local.plan = json.plan
    local.expires_at = json.expires_at
    saveLocalLicense(local)
    _accrueClockState(true) // verificación online confirmada: reinicia el contador de gracia offline
    return { valid: true, license: local }
  } catch(e) {
    // Sin internet — permitir hasta OFFLINE_GRACE_DAYS de tiempo transcurrido
    // *confiable* desde la última verificación exitosa. El tiempo transcurrido
    // se mide cruzando el reloj de pared contra os.uptime() (inmune a cambios
    // de fecha/hora), en vez de confiar únicamente en `Date.now() - last_verified`.
    if (local.last_verified) {
      const { accruedOfflineMs, tampered, reason } = _accrueClockState(false)
      const graceMs = OFFLINE_GRACE_DAYS * 24 * 60 * 60 * 1000
      if (accruedOfflineMs < graceMs) {
        return { valid: true, license: local, offline: true, clockTampered: tampered, clockTamperReason: reason }
      }
    }
    return { valid: false, reason: 'offline_expired' }
  }
}

function getLicenseInfo() { return readLocalLicense() }
function getHardwareId() { return generateHardwareId() }

module.exports = {
  activateLicense,
  verifyLicense,
  getLicenseInfo,
  getHardwareId,
  clearLocalLicense,
  readLocalLicense,
  saveLocalLicense,
  getDeviceCode,
  validateExtensionCode,
  extendLicenseOffline,
}
