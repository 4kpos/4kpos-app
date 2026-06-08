const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { activateLicense, verifyLicense, getLicenseInfo, getHardwareId } = require('./license')

// DevTools solo en desarrollo
const isDev = !app.isPackaged

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
      devTools: isDev
    },
    title: '4K POS',
    icon: path.join(__dirname, 'assets', 'logo.ico'),
    backgroundColor: '#0f0f13',
    show: false,
    autoHideMenuBar: true
  })

  win.loadFile('index.html')
  win.once('ready-to-show', () => win.show())
  win.setMenuBarVisibility(false)

  // Bloquear F12 / DevTools solo en versión instalada
  if (!isDev) {
    win.webContents.on('before-input-event', (event, input) => {
      const key = input.key.toLowerCase()

      if (
        input.key === 'F12' ||
        (input.control && input.shift && key === 'i') ||
        (input.control && input.shift && key === 'j') ||
        (input.control && key === 'u')
      ) {
        event.preventDefault()
      }
    })

    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools()
    })
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
    icon: path.join(__dirname, 'assets', 'logo.ico'),
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

  if (!isDev) {
    win.webContents.on('before-input-event', (event, input) => {
      const key = input.key.toLowerCase()

      if (
        input.key === 'F12' ||
        (input.control && input.shift && key === 'i') ||
        (input.control && input.shift && key === 'j') ||
        (input.control && key === 'u')
      ) {
        event.preventDefault()
      }
    })

    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools()
    })
  }
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

// ── Cerrar app ─────────────────────────────────
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
