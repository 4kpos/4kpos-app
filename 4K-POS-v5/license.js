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
    return { valid: true, license: local }
  } catch(e) {
    // Sin internet — permitir hasta OFFLINE_GRACE_DAYS desde última verificación exitosa
    if (local.last_verified) {
      const diffDays = (Date.now() - new Date(local.last_verified).getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays < OFFLINE_GRACE_DAYS) return { valid: true, license: local, offline: true }
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
