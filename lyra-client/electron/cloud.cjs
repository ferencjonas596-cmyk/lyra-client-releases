const fs = require('node:fs/promises');
const path = require('node:path');
const SERVER_URL = 'https://lyraclientadatbazis.craftmc.eu';
function validateContent(c) {
  if (!c || typeof c.title !== 'string' || !c.title.trim() || c.title.length > 100 || typeof c.subtitle !== 'string' || c.subtitle.length > 240 || typeof c.announcement !== 'string' || c.announcement.length > 400 || !/^#[0-9a-f]{6}$/i.test(c.accent) || !Number.isSafeInteger(c.revision) || c.revision < 0) throw Error('A szerver hibás tartalmat küldött.');
  return { title: c.title, subtitle: c.subtitle, announcement: c.announcement, accent: c.accent, revision: c.revision };
}
async function createCloud({ directory, request, updater, packaged, version }) {
  const cacheFile = path.join(directory, 'content.json');
  const server = SERVER_URL;
  let content = null;
  try { const saved = JSON.parse(await fs.readFile(cacheFile, 'utf8')); if (saved.server === server) content = validateContent(saved.content); } catch {}
  let state = { status: server ? 'idle' : 'unconfigured', message: server ? 'Frissítésre kész.' : 'Még nincs kiadási szerver beállítva.', progress: 0 };
  let checking = false;
  let refreshing;
  let generation = 0;
  let contentError = '';
  if (updater) {
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.allowDowngrade = false;
    updater.allowPrerelease = false;
    updater.on('checking-for-update', () => { state = { status: 'checking', message: 'Launcherfrissítés keresése…', progress: 0 }; });
    updater.on('update-available', info => { state = { status: 'downloading', message: `${info.version} letöltése…`, progress: 0 }; });
    updater.on('download-progress', info => { state = { ...state, status: 'downloading', progress: Math.round(info.percent) }; });
    updater.on('update-not-available', () => { state = { status: 'current', message: 'A legfrissebb launcher van telepítve.', progress: 0 }; });
    updater.on('update-downloaded', info => { state = { status: 'ready', message: `${info.version} letöltve. Kilépéskor települ, vagy most újraindíthatod.`, progress: 100 }; });
    updater.on('error', error => { state = { status: 'error', message: `A frissítés nem érhető el: ${error.message.slice(0, 240)}`, progress: 0 }; });
  }
  const snapshot = () => ({ server, content, contentError, update: state, version, packaged });
  async function refreshContent() {
    if (!server) return snapshot();
    if (refreshing) return refreshing;
    const started = generation;
    const address = server;
    refreshing = (async () => {
      try {
        const response = await request(`${address}/api/content`, { signal: AbortSignal.timeout(12000), redirect: 'error' });
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (text.length > 16000) throw Error('Túl nagy válasz.');
        const received = validateContent(JSON.parse(text));
        if (started !== generation) return snapshot();
        content = received; contentError = '';
        try { await fs.mkdir(directory, { recursive: true }); await fs.writeFile(cacheFile + '.tmp', JSON.stringify({ server: address, content })); await fs.rename(cacheFile + '.tmp', cacheFile); } catch {}
      } catch (error) { if (started === generation) contentError = `A tartalomszerver nem érhető el. ${content ? 'A mentett tartalom látható.' : ''}`; }
      return snapshot();
    })().finally(() => { refreshing = null; });
    return refreshing;
  }
  async function check() {
    if (!server || checking || ['downloading', 'ready'].includes(state.status)) return snapshot();
    if (!packaged) { state = { status: 'development', message: 'EXE-frissítés csak a telepített Windows-alkalmazásban érhető el.', progress: 0 }; return snapshot(); }
    checking = true;
    try { updater.setFeedURL({ provider: 'generic', url: `${server}/updates/` }); await updater.checkForUpdates(); }
    catch (error) { state = { status: 'error', message: `A kiadási csatorna még nem érhető el. ${error.message.slice(0, 160)}`, progress: 0 }; }
    finally { checking = false; }
    return snapshot();
  }
  return { snapshot, refreshContent, check, install() { if (state.status !== 'ready') throw Error('Nincs telepíthető frissítés.'); setImmediate(() => updater.quitAndInstall(false, true)); return true; } };
}
module.exports = { SERVER_URL, validateContent, createCloud };
