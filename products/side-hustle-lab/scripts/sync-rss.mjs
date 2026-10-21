import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRss } from '../src/feed.mjs';

const DEFAULT_SOURCE = 'https://rss.blog.naver.com/jyyjyy86.xml';
const sourceUrl = process.argv[2] ?? DEFAULT_SOURCE;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(root, 'data/source-feed.json');

const response = await fetch(sourceUrl, {
  headers: { 'user-agent': 'side-hustle-lab-research/0.0.0' },
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) {
  throw new Error(`RSS fetch failed: HTTP ${response.status}`);
}

const xml = await response.text();
const items = parseRss(xml, { limit: 50 });
const snapshot = {
  sourceUrl,
  observedAt: new Date().toISOString(),
  authority: 'candidate-discovery-only',
  revenueEvidence: 'UNKNOWN',
  items,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`wrote ${items.length} public RSS candidates to ${outputPath}`);

