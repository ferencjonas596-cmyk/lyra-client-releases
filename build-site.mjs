import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const repo = 'ferencjonas596-cmyk/lyra-client-releases';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Lyra-Publishing' };
async function get(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180000), ...options });
  if (!response.ok) throw Error(`${url}: HTTP ${response.status}`);
  return response;
}
const release = await (await get(`https://api.github.com/repos/${repo}/releases/latest`, { headers })).json();
if (!/^v\d+\.\d+\.\d+$/.test(release.tag_name) || release.draft || release.prerelease) throw Error('Invalid stable release');
const version = release.tag_name.slice(1);
const name = `Lyra-Client-Setup-${version}.exe`;
const exe = release.assets.find(a => a.name === name);
const meta = release.assets.find(a => a.name === 'latest.yml');
if (!exe || !meta || !release.assets.some(a => a.name === `${name}.blockmap`)) throw Error('Release assets incomplete');
const prefix = `https://github.com/${repo}/releases/download/${release.tag_name}/`;
if (exe.browser_download_url !== prefix + name || meta.browser_download_url !== prefix + 'latest.yml') throw Error('Unexpected download origin');
const original = await (await get(meta.browser_download_url)).text();
const expectedHash = /^\s*sha512:\s*['"]?([A-Za-z0-9+/=]+)['"]?\s*$/m.exec(original)?.[1];
const expectedSize = Number(/^\s*size:\s*(\d+)\s*$/m.exec(original)?.[1]);
if (!original.includes(`version: ${version}`) || !expectedHash || expectedSize !== exe.size) throw Error('Invalid release metadata');
const hash = crypto.createHash('sha512');
let count = 0;
const download = await get(exe.browser_download_url);
for await (const chunk of download.body) { hash.update(chunk); count += chunk.length; }
if (hash.digest('base64') !== expectedHash || count !== expectedSize) throw Error('Installer integrity check failed');
const content = JSON.parse(await fs.readFile('content.json', 'utf8'));
for (const [key, max] of Object.entries({ title: 100, subtitle: 240, announcement: 400 })) if (typeof content[key] !== 'string' || content[key].length > max) throw Error(`Invalid ${key}`);
if (!content.title.trim() || !/^#[a-f0-9]{6}$/i.test(content.accent) || !Number.isSafeInteger(content.revision) || content.revision < 0) throw Error('Invalid content');
await fs.mkdir('_site/api', { recursive: true });
await fs.mkdir('_site/updates', { recursive: true });
await fs.writeFile('_site/api/content', JSON.stringify(content));
// JSON is valid YAML, with an absolute release URL so the existing generic updater can download from GitHub.
await fs.writeFile('_site/updates/latest.yml', JSON.stringify({ version, files: [{ url: exe.browser_download_url, sha512: expectedHash, size: expectedSize }], path: exe.browser_download_url, sha512: expectedHash, releaseDate: release.published_at }, null, 2));
await fs.copyFile('index.html', '_site/index.html');
await fs.writeFile('_site/.nojekyll', '');
console.log(`Verified and prepared ${version}, ${count} bytes. Content revision ${content.revision}.`);
