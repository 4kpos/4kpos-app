const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const { activateLicense, verifyLicense, getLicenseInfo, getHardwareId } = require('./license')

let autoUpdater
try {
  autoUpdater = require('electron-updater').autoUpdater
} catch(e) {
  console.log('electron-updater no disponible, actualizaciones desactivadas:', e.message)
}

// DevTools solo en desarrollo (auto-detectado: true cuando no está empaquetado)
const isDev = !app.isPackaged

// ── ID único de máquina ────────────────────────
function getMachineId() {
  const info = os.hostname() + os.platform() + os.arch() + (os.cpus()[0]?.model || '')
  return crypto.createHash('sha256').update(info).digest('hex').substring(0, 32)
}

// ── Datos del POS ──────────────────────────────
const dataPath = path.join(app.getPath('userData'), '4kpos-v5.json')

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    }
  } catch (e) {}
  return null
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
}

// ── Ventana principal del POS ──────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true
    },
    title: '4K POS',
    icon: path.join(__dirname, 'assets', 'logo.ico'), // TODO: regenerar logo.ico con fondo blanco
    backgroundColor: '#0f0f13',
    show: false,
    autoHideMenuBar: true
  })

  win.loadFile('index.html')
  if (isDev) win.webContents.openDevTools()
  win.once('ready-to-show', () => win.show())
  win.setMenuBarVisibility(false)

  win.webContents.on('devtools-opened', () => { win.webContents.closeDevTools() })

  // ── Auto-updater ──────────────────────────────
  if (autoUpdater) {
    try {
      autoUpdater.checkForUpdatesAndNotify()
      autoUpdater.on('update-available', () => {
        win.webContents.send('update-msg', 'downloading')
      })
      autoUpdater.on('update-downloaded', () => {
        win.webContents.send('update-msg', 'ready')
      })
      autoUpdater.on('error', (err) => {
        console.log('AutoUpdater error:', err)
      })
    } catch(e) {
      console.log('AutoUpdater init error:', e)
    }
  }
}

// ── Ventana de activación de licencia ────────────────
function createActivationWindow(reason) {
  const win = new BrowserWindow({
    width: 520,
    height: 640,
    resizable: false,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev
    },
    title: '4K POS - Activación',
    icon: path.join(__dirname, 'assets', 'logo.ico'), // TODO: regenerar logo.ico con fondo blanco
    backgroundColor: '#0a0a0f',
    show: false,
    autoHideMenuBar: true
  })

  win.loadFile('activation.html')
  win.once('ready-to-show', () => win.show())
  win.setMenuBarVisibility(false)

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('activation-reason', reason)
  })

}

// ── Arrancar app con verificación de licencia ────────
app.whenReady().then(async () => {
  const result = await verifyLicense()

  if (result.valid) {
    createWindow()
  } else {
    createActivationWindow(result.reason)
  }
})

// ── IPC: datos del POS ────────────────────────
ipcMain.handle('load-data', () => {
  return loadData()
})

ipcMain.handle('save-data', (_, data) => {
  saveData(data)
  return true
})

// ── IPC: licencia ────────────────────────────────────
ipcMain.handle('activate-license', async (_, licenseKey) => {
  const result = await activateLicense(licenseKey)

  if (result.ok) {
    app.relaunch()
    app.exit(0)
  }

  return result
})

ipcMain.handle('get-license-info', () => getLicenseInfo())
ipcMain.handle('get-hardware-id', () => getHardwareId())
ipcMain.handle('get-machine-id', () => getMachineId())

// ── IPC: cerrar app ────────────────────────────
ipcMain.handle('exit-app', () => { app.quit() })

// ── IPC: reiniciar para instalar actualización ─
ipcMain.on('restart-app', () => {
  if (autoUpdater) {
    try { autoUpdater.quitAndInstall() } catch(e) { app.relaunch(); app.exit(0) }
  } else {
    app.relaunch()
    app.exit(0)
  }
})

// ── Cerrar app ─────────────────────────────────
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
