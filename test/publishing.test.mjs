import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { repository, validateRelease, validateContent, buildSite } from '../build-site.mjs';

const exe = Buffer.from('MZ-fixture-not-executable');
const hash = crypto.createHash('sha512').update(exe).digest('base64');
const name = 'Lyra-Client-Setup-0.3.1.exe';
const prefix = `https://github.com/${repository}/releases/download/v0.3.1/`;
const metadata = YAML.stringify({ version: '0.3.1', path: name, sha512: hash, files: [{ url: name, sha512: hash, size: exe.length }] });
const release = { tag_name: 'v0.3.1', published_at: '2026-09-20T12:00:00Z', assets: [[name, exe.length], [name + '.blockmap', 2], ['latest.yml', Buffer.byteLength(metadata)]].map(([name, size]) => ({ name, size, browser_download_url: prefix + name })) };
const content = { title: 'Lyra', subtitle: '', announcement: '', accent: '#7762c9', revision: 1 };

test('rejects incomplete, foreign, duplicate, prerelease and mismatched release metadata', () => {
  assert.equal(validateRelease(release, metadata).version, '0.3.1');
  assert.throws(() => validateRelease({ ...release, assets: release.assets.slice(1) }, metadata));
  assert.throws(() => validateRelease({ ...release, assets: [...release.assets, release.assets[0]] }, metadata));
  assert.throws(() => validateRelease({ ...release, draft: true }, metadata));
  assert.throws(() => validateRelease({ ...release, prerelease: true }, metadata));
  assert.throws(() => validateRelease(release, metadata.replace('0.3.1', '0.3.10')));
  assert.throws(() => validateRelease({ ...release, assets: release.assets.map(a => ({ ...a, browser_download_url: 'https://example.com/file' })) }, metadata));
  assert.throws(() => validateContent({ ...content, title: '' }));
  assert.throws(() => validateContent({ ...content, revision: -1 }));
});

test('generates compatible endpoints only after every release asset passes verification', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lyra-publish-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, 'content.json'), JSON.stringify(content));
  await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><title>Lyra</title>');
  await fs.writeFile(path.join(root, 'lyra-logo.png'), 'logo-fixture');
  const out = path.join(root, 'site');
  const fixtures = new Map([
    [`https://api.github.com/repos/${repository}/releases/latest`, JSON.stringify(release)],
    [prefix + 'latest.yml', metadata], [prefix + name, exe], [prefix + name + '.blockmap', '{}']
  ]);
  const fetcher = async url => new Response(fixtures.get(url), { status: fixtures.has(url) ? 200 : 404 });
  await buildSite({ fetcher, root, out });
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(out, 'api/content'), 'utf8')), content);
  const feed = YAML.parse(await fs.readFile(path.join(out, 'updates/latest.yml'), 'utf8'));
  assert.equal(feed.files[0].url, prefix + name);
  assert.equal(feed.sha512, hash);
  const previous = await fs.readFile(path.join(out, 'updates/latest.yml'), 'utf8');
  fixtures.set(prefix + name, Buffer.from('MZ-corrupt'));
  await assert.rejects(buildSite({ fetcher, root, out }), /integrity/);
  assert.equal(await fs.readFile(path.join(out, 'updates/latest.yml'), 'utf8'), previous);
});
