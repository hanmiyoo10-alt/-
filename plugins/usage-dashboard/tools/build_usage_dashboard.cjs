const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {PARTS} = require('../src/parts.cjs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const MANIFEST = path.join(SRC, 'manifest.json');
const LATEST = path.join(ROOT, 'latest.js');
const hash = (content) => crypto.createHash('sha256').update(content).digest('hex');

const partStates = PARTS.map((part) => {
  const file = path.join(SRC, part.file);
  if (!fs.existsSync(file)) throw new Error(`missing source part: ${part.file}`);
  const content = fs.readFileSync(file, 'utf8');
  if (!content.length) throw new Error(`empty source part: ${part.file}`);
  if (part.marker && !content.startsWith(part.marker)) throw new Error(`boundary drift: ${part.file}`);
  return {...part, content, bytes:Buffer.byteLength(content), sha256:hash(content)};
});

const built = partStates.map((part) => part.content).join('');
const version = (built.match(/^\/\/@version (.+)$/m) || [])[1] || 'unknown';
if (version === 'unknown') throw new Error('bundle version marker is missing');

const generatedManifest = {
  format:1,
  plugin:'Local Usage Dashboard',
  version,
  source:'plugins/usage-dashboard/latest.js',
  sourceOfTruth:'modules',
  layout:'plugins/usage-dashboard/src/parts.cjs',
  artifactSha256:hash(built),
  parts:partStates.map(({content, marker, ...part}) => part)
};
const manifestText = JSON.stringify(generatedManifest, null, 2) + '\n';

if (process.argv.includes('--check')) {
  if (!fs.existsSync(MANIFEST)) throw new Error('usage-dashboard src/manifest.json is missing');
  if (!fs.existsSync(LATEST)) throw new Error('usage-dashboard latest.js is missing');
  if (fs.readFileSync(MANIFEST, 'utf8') !== manifestText) throw new Error('manifest.json differs from generated modular manifest');
  if (fs.readFileSync(LATEST, 'utf8') !== built) throw new Error('latest.js differs from deterministic modular source bundle');
  console.log(`usage-dashboard source parity: OK · ${PARTS.length} modules · ${version}`);
  process.exit(0);
}

if (process.argv.includes('--write')) {
  fs.writeFileSync(LATEST, built);
  fs.writeFileSync(MANIFEST, manifestText);
  console.log(`usage-dashboard bundle written from modules: ${PARTS.length} modules · ${version}`);
  process.exit(0);
}

process.stdout.write(built);
