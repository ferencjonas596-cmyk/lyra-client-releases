const fs = require('node:fs/promises');
const path = require('node:path');
const URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
function validate(data) {
  if (!data?.latest?.release || !data.latest.snapshot || !Array.isArray(data.versions) || !data.versions.length) throw Error('Invalid manifest');
  const types = new Set(['release', 'snapshot', 'old_beta', 'old_alpha']);
  const versions = data.versions.map(v => {
    if (typeof v.id !== 'string' || !types.has(v.type)) throw Error('Invalid version');
    return { id: v.id, type: v.type };
  });
  if (!versions.some(v => v.id === data.latest.release) || !versions.some(v => v.id === data.latest.snapshot)) throw Error('Missing latest version');
  return { latest: { release: data.latest.release, snapshot: data.latest.snapshot }, versions };
}
function createVersionService(directory, request = fetch) {
  let pending;
  const file = path.join(directory, 'versions.json');
  return () => {
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await request(URL, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw Error('Manifest request failed');
        const result = { ...validate(await response.json()), fetchedAt: new Date().toISOString(), cached: false };
        try { await fs.mkdir(directory, { recursive: true }); await fs.writeFile(file + '.tmp', JSON.stringify(result)); await fs.rename(file + '.tmp', file); } catch { /* A successful live response is usable even when the cache is not writable. */ }
        return result;
      } catch {
        try { const cached = JSON.parse(await fs.readFile(file, 'utf8')); return { ...validate(cached), fetchedAt: cached.fetchedAt, cached: true }; }
        catch { throw Error('A verziólista nem érhető el. Ellenőrizd az internetkapcsolatot, majd próbáld újra.'); }
      }
    })().finally(() => { pending = null; });
    return pending;
  };
}
module.exports = { createVersionService, validate };
