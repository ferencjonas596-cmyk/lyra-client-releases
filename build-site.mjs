import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import YAML from 'yaml';
import semver from 'semver';

export const repository = 'ferencjonas596-cmyk/lyra-client-releases';
const maxInstaller = 512 * 1024 * 1024;

export function validateContent(value) {
  for (const [key, limit] of Object.entries({ title: 100, subtitle: 240, announcement: 400 })) {
    if (typeof value?.[key] !== 'string' || value[key].length > limit) throw Error(`Invalid content: ${key}`);
  }
  if (!value.title.trim() || !/^#[a-f0-9]{6}$/i.test(value.accent) || !Number.isSafeInteger(value.revision) || value.revision < 0) throw Error('Invalid content');
  return Object.fromEntries(['title', 'subtitle', 'announcement', 'accent', 'revision'].map(key => [key, value[key]]));
}

export function validateRelease(release, metadata) {
  const version = release?.tag_name?.slice(1);
  if (release?.tag_name !== `v${version}` || !semver.valid(version) || semver.prerelease(version) || release.draft || release.prerelease) throw Error('Invalid stable release');
  const name = `Lyra-Client-Setup-${version}.exe`;
  const prefix = `https://github.com/${repository}/releases/download/v${version}/`;
  const required = [name, `${name}.blockmap`, 'latest.yml'].map(filename => {
    const assets = release.assets?.filter(asset => asset.name === filename) ?? [];
    if (assets.length !== 1 || assets[0].browser_download_url !== prefix + filename || !Number.isSafeInteger(assets[0].size) || assets[0].size <= 0) throw Error(`Missing or invalid asset: ${filename}`);
    return assets[0];
  });
  const [exe, blockmap, meta] = required;
  if (exe.size > maxInstaller || blockmap.size > 10 * 1024 * 1024 || meta.size > 65536) throw Error('Asset too large');
  const doc = YAML.parse(metadata, { maxAliasCount: 0 });
  if (doc?.version !== version || doc.path !== name || doc.files?.length !== 1 || doc.files[0].url !== name || doc.files[0].size !== exe.size || doc.files[0].sha512 !== doc.sha512 || !/^[A-Za-z0-9+/]{86}==$/.test(doc.sha512 ?? '')) throw Error('Release metadata mismatch');
  return { version, exe, blockmap, sha512: doc.sha512 };
}

export async function buildSite({ fetcher = fetch, root = '.', out = '_site' } = {}) {
  async function get(url, max, headers = {}) {
    const response = await fetcher(url, { headers, signal: AbortSignal.timeout(180000) });
    if (!response.ok) throw Error(`HTTP ${response.status}: ${url}`);
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > max) throw Error('Download exceeds size limit');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  const release = JSON.parse(await get(`https://api.github.com/repos/${repository}/releases/latest`, 2 * 1024 * 1024, { Accept: 'application/vnd.github+json', 'User-Agent': 'Lyra-Publishing' }));
  const metaUrl = `https://github.com/${repository}/releases/download/${release.tag_name}/latest.yml`;
  if (!/^v\d+\.\d+\.\d+$/.test(release.tag_name ?? '')) throw Error('Invalid release tag');
  const verified = validateRelease(release, (await get(metaUrl, 65536)).toString('utf8'));
  const bytes = await get(verified.exe.browser_download_url, maxInstaller);
  if (bytes.length !== verified.exe.size || bytes.subarray(0, 2).toString() !== 'MZ' || crypto.createHash('sha512').update(bytes).digest('base64') !== verified.sha512) throw Error('Installer integrity check failed');
  const blockmap = await get(verified.blockmap.browser_download_url, 10 * 1024 * 1024);
  if (blockmap.length !== verified.blockmap.size) throw Error('Blockmap size mismatch');
  const content = validateContent(JSON.parse(await fs.readFile(path.join(root, 'content.json'), 'utf8')));
  const feed = { version: verified.version, files: [{ url: verified.exe.browser_download_url, sha512: verified.sha512, size: bytes.length }], path: verified.exe.browser_download_url, sha512: verified.sha512, releaseDate: release.published_at };
  // Only generated public files enter the Pages artifact; source and admin secrets cannot be served.
  await fs.mkdir(path.join(out, 'api'), { recursive: true });
  await fs.mkdir(path.join(out, 'updates'), { recursive: true });
  await fs.writeFile(path.join(out, 'api/content'), JSON.stringify(content));
  await fs.writeFile(path.join(out, 'updates/latest.yml'), YAML.stringify(feed));
  await fs.writeFile(path.join(out, 'status.json'), JSON.stringify({ version: verified.version, contentRevision: content.revision, installerBytes: bytes.length, builtAt: new Date().toISOString() }, null, 2));
  await fs.copyFile(path.join(root, 'index.html'), path.join(out, 'index.html'));
  await fs.writeFile(path.join(out, '.nojekyll'), '');
  console.log(`Verified ${verified.version}: ${bytes.length} bytes; content revision ${content.revision}`);
  return feed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await buildSite();
