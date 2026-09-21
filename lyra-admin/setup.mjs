import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
try {
  await writeFile('.env', `ADMIN_TOKEN=${randomBytes(32).toString('hex')}\nHOST=127.0.0.1\nPORT=4310\nPUBLIC_URL=http://127.0.0.1:4310\n`, { flag: 'wx', mode: 0o600 });
  console.log('Kész: .env. Az ADMIN_TOKEN értékével léphetsz be. Indítás: npm start');
} catch (e) { if (e.code === 'EEXIST') console.log('A .env már létezik; a belépési kulcs változatlan.'); else throw e; }

