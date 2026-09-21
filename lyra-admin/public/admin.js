const $ = id => document.getElementById(id);
let token = '';
let revision = 0;
let draftSaved = true;
function status(message, error = false) { $('status').textContent = message; $('status').className = error ? 'error' : ''; }
async function api(route, options = {}) {
  const response = await fetch(`/api/admin/${route}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'A kérés nem sikerült.');
  return data;
}
function getDraft() { return Object.fromEntries(new FormData($('editor'))); }
function preview() { const draft = getDraft(); $('preview-title').textContent = draft.title; $('preview-subtitle').textContent = draft.subtitle; $('preview-announcement').textContent = draft.announcement; document.querySelector('.preview-play').style.backgroundColor = draft.accent; }
async function load() {
  const state = await api('state');
  revision = state.content.revision;
  for (const [key, value] of Object.entries(state.content.draft)) $('editor').elements.namedItem(key).value = value;
  $('revision').textContent = `Publikált változat: ${revision}`;
  $('current').textContent = state.release ? `Aktív: ${state.release.version}` : 'Még nincs kiadás';
  $('server-url').textContent = state.publicURL;
  $('workspace').hidden = false; $('login').hidden = true; $('logout').hidden = false; draftSaved = true; preview();
}
$('login-form').addEventListener('submit', async event => { event.preventDefault(); token = $('token').value.trim(); try { await load(); $('token').value = ''; status('Sikeres belépés.'); } catch (e) { token = ''; status(e.message, true); } });
$('logout').addEventListener('click', () => { token = ''; $('workspace').hidden = true; $('login').hidden = false; $('logout').hidden = true; status('Kijelentkeztél.'); });
$('editor').addEventListener('input', () => { draftSaved = false; preview(); });
$('editor').addEventListener('submit', async event => { event.preventDefault(); try { await api('draft', { method: 'PUT', body: JSON.stringify(getDraft()) }); draftSaved = true; status('Piszkozat mentve. A launcher tartalma még nem változott.'); } catch (e) { status(e.message, true); } });
$('publish').addEventListener('click', async () => { if (!draftSaved) return status('Először mentsd el a piszkozatot.', true); try { const result = await api('publish', { method: 'POST', body: JSON.stringify({ revision }) }); revision = result.revision; $('revision').textContent = `Publikált változat: ${revision}`; status('Közzétéve. A kapcsolódó launcherek egy percen belül átveszik a tartalmat.'); } catch (e) { status(e.message, true); } });
$('release-files').addEventListener('change', () => { $('file-list').replaceChildren(...[...$('release-files').files].map(file => { const li = document.createElement('li'); li.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`; return li; })); });
$('release-form').addEventListener('submit', async event => { event.preventDefault(); const files = [...$('release-files').files]; if (!files.some(f => f.name === 'latest.yml') || !files.some(f => f.name.endsWith('.exe'))) return status('Az EXE és a latest.yml együtt szükséges.', true); const body = new FormData(); files.forEach(file => body.append('files', file)); $('deploy').disabled = true; status('Feltöltés és ellenőrzés folyamatban. Nagy EXE esetén ez néhány percig is tarthat.'); try { const result = await api('deploy', { method: 'POST', body }); $('current').textContent = `Aktív: ${result.version}`; $('release-form').reset(); $('file-list').replaceChildren(); status(`A(z) ${result.version} kiadás elérhető a frissítési csatornán.`); } catch (e) { status(e.message, true); } finally { $('deploy').disabled = false; } });
