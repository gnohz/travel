import { readFile, writeFile, readdir, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { serviceWorkerSource } from './sw-template.mjs';
const base = '/travel/sedona-2026/';
await mkdir('dist/data', { recursive: true });
await copyFile('src/data/travel.json', 'dist/data/travel.json');
async function list(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = await Promise.all(entries.map(e => e.isDirectory() ? list(`${dir}/${e.name}`, `${prefix}${e.name}/`) : `${prefix}${e.name}`));
  return result.flat().filter(p => !p.endsWith('.map') && p !== 'sw.js' && p !== 'version.json').sort();
}
const paths = await list('dist');
const hash = createHash('sha256');
for (const path of paths) hash.update(path).update(await readFile(`dist/${path}`));
hash.update(await readFile('scripts/sw-template.mjs'));
const version = hash.digest('hex').slice(0, 16);
const files = paths.map(p => base + p);
await writeFile('dist/sw.js', serviceWorkerSource({ base, version, files }));
await writeFile('dist/version.json', JSON.stringify({ version, resources: files.length }));
console.log(`Offline manifest: ${files.length} resources, version ${version}`);
