import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateCandidate } from '../src/classifier.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  'index.html',
  'assets/app.js',
  'assets/styles.css',
  'data/ideas.json',
  'src/classifier.mjs',
  'src/feed.mjs',
  'CURRENT.md',
  'product.json',
];

await Promise.all(requiredFiles.map((path) => access(resolve(root, path))));

const ideas = JSON.parse(await readFile(resolve(root, 'data/ideas.json'), 'utf8'));
if (!Array.isArray(ideas) || ideas.length < 3) {
  throw new Error('data/ideas.json must contain at least three candidates');
}

const ids = new Set();
for (const candidate of ideas) {
  if (ids.has(candidate.id)) throw new Error(`duplicate candidate id: ${candidate.id}`);
  ids.add(candidate.id);
  evaluateCandidate(candidate);

  if ('revenue' in candidate || 'expectedRevenue' in candidate) {
    throw new Error(`${candidate.id} contains an invented revenue field`);
  }
}

const html = await readFile(resolve(root, 'index.html'), 'utf8');
for (const phrase of ['수익 숫자: UNKNOWN', '수익을 보장하지 않으며', '무료 체험 ≠ 무료']) {
  if (!html.includes(phrase)) throw new Error(`required disclosure missing: ${phrase}`);
}

const manifest = JSON.parse(await readFile(resolve(root, 'product.json'), 'utf8'));
if (manifest.release_authority !== null || manifest.deployment_authority !== null) {
  throw new Error('research prototype must not declare release/deployment authority');
}

console.log(`static check passed: ${ideas.length} candidates, ${requiredFiles.length} required files`);

