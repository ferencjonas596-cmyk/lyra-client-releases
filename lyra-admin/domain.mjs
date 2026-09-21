import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import semver from 'semver';

export const initialContent = { title: 'A következő kalandod itt kezdődik.', subtitle: 'Ismerős világ. Új perspektíva. Építs valamit, ami csak a tiéd.', announcement: 'Üdv a Lyra Clientben!', accent: '#7762c9' };
export function validateContent(value) {
  const out = {};
  for (const [key, limit] of Object.entries({ title: 100, subtitle: 240, announcement: 400, accent: 7 })) {
    if (typeof value?.[key] !== 'string' || value[key].length > limit) throw Error(`Érvénytelen mező: ${key}`);
    out[key] = value[key].trim();
  }
  if (!out.title || !/^#[0-9a-f]{6}$/i.test(out.accent)) throw Error('Adj meg címet és érvényes színt.');
  return out;
}
export async function atomicJSON(file, value) {
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try { await fs.writeFile(temp, JSON.stringify(value, null, 2)); await fs.rename(temp, file); }
  finally { await fs.rm(temp, { force: true }); }
}
export async function readJSON(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}
export async function digest(file) { const hash = crypto.createHash('sha512'); for await (const chunk of createReadStream(file)) hash.update(chunk); return hash.digest('base64'); }

// Only locally uploaded release artifacts can enter the update feed.
export async function validateRelease(files, current) {
  if (files.length < 2 || files.length > 3) throw Error('Az EXE és a latest.yml szükséges; a blockmap opcionális.');
  const names = new Set();
  for (const f of files) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,150}$/.test(f.originalname) || names.has(f.originalname)) throw Error('Érvénytelen vagy ismétlődő fájlnév.');
    names.add(f.originalname);
  }
  const meta = files.find(f => f.originalname === 'latest.yml');
  const exe = files.find(f => f.originalname.endsWith('.exe'));
  if (!meta || !exe || meta.size > 65536 || files.filter(f => f.originalname.endsWith('.exe')).length !== 1) throw Error('Hibás kiadási fájlok.');
  if (files.some(f => !['latest.yml', exe.originalname, `${exe.originalname}.blockmap`].includes(f.originalname))) throw Error('Nem támogatott fájl.');
  const doc = YAML.parse(await fs.readFile(meta.path, 'utf8'), { maxAliasCount: 0 });
  if (!semver.valid(doc?.version) || semver.prerelease(doc.version) || (current && !semver.gt(doc.version, current.version))) throw Error('A kiadásnak újabb, stabil verziószámot kell kapnia.');
  if (!Array.isArray(doc.files) || doc.files.length !== 1 || doc.files[0].url !== exe.originalname || doc.path !== exe.originalname) throw Error('A latest.yml nem a feltöltött EXE-re mutat.');
  const hash = await digest(exe.path);
  if (hash !== doc.sha512 || hash !== doc.files[0].sha512 || doc.files[0].size !== exe.size) throw Error('A telepítő mérete vagy SHA-512 ellenőrzőösszege hibás.');
  const handle = await fs.open(exe.path, 'r');
  try { const signature = Buffer.alloc(2); await handle.read(signature, 0, 2, 0); if (signature.toString() !== 'MZ') throw Error('Nem Windows EXE.'); } finally { await handle.close(); }
  const relative = `releases/${doc.version}/${exe.originalname}`;
  return { version: doc.version, filename: exe.originalname, sha512: hash, size: exe.size, publishedAt: new Date().toISOString(), manifest: YAML.stringify({ version: doc.version, files: [{ url: relative, sha512: hash, size: exe.size }], path: relative, sha512: hash, releaseDate: new Date().toISOString() }) };
}
