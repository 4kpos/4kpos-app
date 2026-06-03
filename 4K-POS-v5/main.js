const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const dataPath = path.join(app.getPath('userData'), '4kpos-v5.json')

function loadData() {
  try { if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf8')) } catch(e) {}
  return null
}
function saveData(data) { fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)) }

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

ipcMain.handle('load-data', () => loadData())
ipcMain.handle('save-data', (_, data) => { saveData(data); return true })

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
