const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { activateLicense, verifyLicense, getLicenseInfo, getHardwareId } = require('./license')
 
// ── Datos del POS (sin cambios) ──────────────────────────────
const dataPath = path.join(app.getPath('userData'), '4kpos-v5.json')
function loadData() {
  try { if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf8')) } catch(e) {}
  return null
}
function saveData(data) { fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)) }
 
// ── Ventana principal del POS (sin cambios) ──────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1024, minHeight: 700,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: '4K POS', icon: path.join(__dirname, 'assets', 'logo.ico'),
    backgroundColor: '#0f0f13', show: false, autoHideMenuBar: true
  })
 win.loadFile('index.html')
  win.once('ready-to-show', () => win.show())
  win.setMenuBarVisibility(false)
}
 
// ── Ventana de activación de licencia (NUEVO) ────────────────
function createActivationWindow(reason) {
  const win = new BrowserWindow({
    width: 520, height: 640,
    resizable: false,
    frame: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    title: '4K POS - Activación',
    icon: path.join(__dirname, 'assets', 'logo.ico'),
    backgroundColor: '#0a0a0f',
    show: false,
    autoHideMenuBar: true
  })
  win.loadFile('activation.html')
  win.once('ready-to-show', () => win.show())
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('activation-reason', reason)
  })
}
 
// ── Arrancar app con verificación de licencia (NUEVO) ────────
app.whenReady().then(async () => {
  const result = await verifyLicense()
  if (result.valid) {
    createWindow()
  } else {
    createActivationWindow(result.reason)
  }
})
 
// ── IPC: datos del POS (sin cambios) ────────────────────────
// ── IPC: datos del POS ────────────────────────

ipcMain.handle('load-data', () => {
  return loadData()
})

ipcMain.handle('save-data', (_, data) => {
  saveData(data)
  return true
})
 
// ── IPC: licencia (NUEVO) ────────────────────────────────────
ipcMain.handle('activate-license', async (_, licenseKey) => {
  const result = await activateLicense(licenseKey)
  if (result.ok) {
    // Reiniciar la app tras activación exitosa
    app.relaunch()
    app.exit(0)
  }
  return result
})
ipcMain.handle('get-license-info', () => getLicenseInfo())
ipcMain.handle('get-hardware-id', () => getHardwareId())
 
// ── Cerrar app (sin cambios) ─────────────────────────────────
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
 
