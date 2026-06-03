// ============================================================
// 4K POS v5 — license.js
// Colócalo en: 4K-POS-v5/license.js
// ============================================================
 
const { app } = require('electron')
const os = require('os')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
 
const API_URL = 'https://izalnhluwtyotuxwkqrh.supabase.co/functions/v1/posapi'
const LICENSE_FILE = path.join(app.getPath('userData'), '4kpos_license.json')
 
// Genera un ID único y estable basado en el hardware
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
 
// Activa la licencia en este equipo por primera vez
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
 
// Verifica la licencia al arrancar (online o modo offline hasta 7 días)
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
    // Sin internet — permitir hasta 7 días desde última verificación
    if (local.last_verified) {
      const diffDays = (Date.now() - new Date(local.last_verified).getTime()) / (1000*60*60*24)
      if (diffDays < 7) return { valid: true, license: local, offline: true }
    }
    return { valid: false, reason: 'offline_expired' }
  }
}
 
function getLicenseInfo() { return readLocalLicense() }
function getHardwareId() { return generateHardwareId() }
 
module.exports = { activateLicense, verifyLicense, getLicenseInfo, getHardwareId, clearLocalLicense }
 
