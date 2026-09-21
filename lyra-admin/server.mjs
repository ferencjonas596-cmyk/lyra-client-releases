import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialContent, validateContent, atomicJSON, readJSON, validateRelease } from './domain.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
export async function createAdmin({ directory, token, publicURL }) {
  if (!token || token.length < 32) throw Error('Legalább 32 karakteres ADMIN_TOKEN szükséges. Futtasd: npm run setup');
  const origin = new URL(publicURL);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)))) throw Error('PUBLIC_URL: HTTPS eredetcím vagy helyi HTTP cím szükséges.');
  await fs.mkdir(path.join(directory, 'incoming'), { recursive: true });
  await fs.mkdir(path.join(directory, 'releases'), { recursive: true });
  const contentFile = path.join(directory, 'content.json');
  const releaseFile = path.join(directory, 'release.json');
  let content = await readJSON(contentFile, { draft: initialContent, published: initialContent, revision: 0 });
  let release = await readJSON(releaseFile, null);
  let busy = false;
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => { res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" }); next(); });
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/content', (_req, res) => res.set('Cache-Control', 'no-store').json({ ...content.published, revision: content.revision }));
  app.get('/updates/latest.yml', (_req, res) => { if (!release) return res.status(404).send('Még nincs kiadás.'); res.set('Cache-Control', 'no-store').type('text/yaml').send(release.manifest); });
  app.use('/updates/releases', express.static(path.join(directory, 'releases'), { dotfiles: 'deny', immutable: true, maxAge: '1y', index: false }));
  const expected = crypto.createHash('sha256').update(token).digest();
  app.use('/api/admin', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.headers.origin && req.headers.origin !== origin.origin) return res.status(403).json({ error: 'Érvénytelen eredet.' });
    const supplied = crypto.createHash('sha256').update(req.headers.authorization || '').digest();
    const authorized = crypto.createHash('sha256').update(`Bearer ${token}`).digest();
    if (!crypto.timingSafeEqual(supplied, authorized)) return res.status(401).json({ error: 'Hibás adminisztrátori kulcs.' });
    next();
  });
  app.use('/api/admin', express.json({ limit: '16kb' }));
  app.get('/api/admin/state', (_req, res) => res.json({ content, release: release && { version: release.version, publishedAt: release.publishedAt, filename: release.filename }, publicURL: origin.origin }));
  async function exclusive(res, operation) { if (busy) return res.status(409).json({ error: 'Egy művelet már folyamatban van.' }); busy = true; try { await operation(); } finally { busy = false; } }
  app.put('/api/admin/draft', (req, res, next) => exclusive(res, async () => { const draft = validateContent(req.body); const updated = { ...content, draft }; await atomicJSON(contentFile, updated); content = updated; res.json({ ok: true }); }).catch(next));
  app.post('/api/admin/publish', (req, res, next) => exclusive(res, async () => { if (req.body.revision !== content.revision) return res.status(409).json({ error: 'A tartalom közben megváltozott. Töltsd újra a panelt.' }); const updated = { ...content, published: content.draft, revision: content.revision + 1 }; await atomicJSON(contentFile, updated); content = updated; res.json({ ok: true, revision: content.revision }); }).catch(next));
  const upload = multer({ dest: path.join(directory, 'incoming'), limits: { files: 3, fileSize: 350 * 1024 * 1024, fields: 0, parts: 3 } }).array('files', 3);
  app.post('/api/admin/deploy', (req, res, next) => {
    if (busy) return res.status(409).json({ error: 'Egy művelet már folyamatban van.' });
    busy = true;
    upload(req, res, async uploadError => {
      let created, failure, publishedVersion;
      try {
        if (uploadError) throw uploadError;
        const candidate = await validateRelease(req.files || [], release);
        created = path.join(directory, 'releases', candidate.version);
        // Immutable version directories prevent an existing installed version being silently replaced.
        await fs.mkdir(created);
        for (const f of req.files) if (f.originalname !== 'latest.yml') await fs.copyFile(f.path, path.join(created, f.originalname));
        await atomicJSON(releaseFile, candidate);
        release = candidate; created = null;
        publishedVersion = candidate.version;
      } catch (error) { if (created && error.code !== 'EEXIST') await fs.rm(created, { recursive: true, force: true }).catch(() => {}); failure = error; }
      finally { const cleanup = await Promise.allSettled((req.files || []).map(f => fs.rm(f.path, { force: true }))); busy = false; for (const result of cleanup) if (result.status === 'rejected') console.error('Upload cleanup failed:', result.reason.message); } if (failure) next(failure); else res.json({ ok: true, version: publishedVersion });
    });
  });
  app.use(express.static(path.join(root, 'public'), { index: 'index.html', maxAge: 0 }));
  app.use((error, _req, res, _next) => { console.error(error.message); res.status(400).json({ error: error.code === 'EEXIST' ? 'Ez a verzió már fel lett töltve.' : error.message || 'A művelet nem sikerült.' }); });
  return app;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4310);
  const publicURL = process.env.PUBLIC_URL || `http://127.0.0.1:${port}`;
  const app = await createAdmin({ directory: path.resolve(process.env.DATA_DIR || path.join(root, 'data')), token: process.env.ADMIN_TOKEN, publicURL });
  app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Lyra Admin: ${publicURL}`));
}
