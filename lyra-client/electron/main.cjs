const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('node:path');
const smoke = process.argv.includes('--smoke-test');
if (process.env.LYRA_SOFTWARE_RENDERING === '1') app.disableHardwareAcceleration();
if (process.env.LYRA_USER_DATA) app.setPath('userData', process.env.LYRA_USER_DATA);
function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 840, minWidth: 940, minHeight: 680, backgroundColor: '#090d18', title: 'Lyra Client', autoHideMenuBar: true, show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.once('ready-to-show', () => { if (!smoke) win.show(); });
  win.webContents.on('did-fail-load', (_event, code, description) => { console.error(code, description); if (smoke) app.exit(1); });
  if (smoke) {
    const timeout = setTimeout(() => app.exit(1), 20000);
    win.webContents.once('did-finish-load', async () => {
      try {
        if (process.env.LYRA_SCREENSHOT) {
          await new Promise(resolve => setTimeout(resolve, 500));
          require('node:fs').writeFileSync(process.env.LYRA_SCREENSHOT, (await win.webContents.capturePage()).toPNG());
        }
        const result = await win.webContents.executeJavaScript(`(async () => {
          const wait = () => new Promise(resolve => setTimeout(resolve, 200));
          const click = text => { const el = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === text); if (!el) throw Error('Missing button: '+text); el.click(); };
          if (!document.body.textContent.includes('A következő kalandod')) throw Error('Home missing');
          click('Mods'); await wait(); if (!document.querySelector('[role="switch"]')) throw Error('Mods missing');
          click('Settings'); await wait(); if (!document.querySelector('input[type="range"]')) throw Error('Settings missing');
          click('Home'); await wait(); click('PLAY GUI DEMÓ'); await wait(); if (!document.querySelector('dialog[open]')) throw Error('Play dialog missing');
          return 'PASS: Home, Mods, Settings, Play';
        })()`);
        console.log(result); clearTimeout(timeout); app.exit(0);
      } catch (error) { console.error(error); app.exit(1); }
    });
  }
  if (process.env.LYRA_DEV_URL === 'http://127.0.0.1:5173' && !app.isPackaged) win.loadURL(process.env.LYRA_DEV_URL);
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
}
app.whenReady().then(async () => {
  const versions = require('./versions.cjs').createVersionService(app.getPath('userData'), (...args) => net.fetch(...args));
  const permitted = event => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (!owner || event.senderFrame !== event.sender.mainFrame) throw Error('Invalid caller');
  };
  ipcMain.handle('lyra:versions', event => { permitted(event); return versions(); });
  const cloud = await require('./cloud.cjs').createCloud({
    directory: app.getPath('userData'), request: (...args) => net.fetch(...args),
    updater: require('electron-updater').autoUpdater, packaged: app.isPackaged,
    version: app.getVersion()
  });
  ipcMain.handle('lyra:cloud', event => { permitted(event); return cloud.snapshot(); });
  ipcMain.handle('lyra:check-update', event => { permitted(event); return cloud.check(); });
  ipcMain.handle('lyra:install-update', event => { permitted(event); return cloud.install(); });
  if (!smoke) {
    void cloud.refreshContent(); void cloud.check();
    setInterval(() => void cloud.refreshContent(), 60_000).unref();
    setInterval(() => void cloud.check(), 60 * 60_000).unref();
  }
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
