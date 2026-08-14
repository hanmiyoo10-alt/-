const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const MANIFEST = path.join(SRC, 'manifest.json');
const LATEST = path.join(ROOT, 'latest.js');

if (!fs.existsSync(MANIFEST)) throw new Error('usage-dashboard src/manifest.json is missing');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
if (manifest?.format !== 1 || !Array.isArray(manifest.parts) || !manifest.parts.length) {
  throw new Error('usage-dashboard source manifest is invalid');
}

const chunks = [];
for (const part of manifest.parts) {
  const file = path.join(SRC, String(part.file || ''));
  if (!fs.existsSync(file)) throw new Error(`missing source part: ${part.file}`);
  const content = fs.readFileSync(file, 'utf8');
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  if (part.sha256 && part.sha256 !== sha256) throw new Error(`source part hash mismatch: ${part.file}`);
  chunks.push(content);
}

const built = chunks.join('');
const artifactSha256 = crypto.createHash('sha256').update(built).digest('hex');
const version = (built.match(/^\/\/@version (.+)$/m) || [])[1] || 'unknown';
if (manifest.version && manifest.version !== version) throw new Error(`manifest version ${manifest.version} != bundle version ${version}`);
if (manifest.artifactSha256 && manifest.artifactSha256 !== artifactSha256) throw new Error('bundle hash differs from manifest artifact hash');

const check = process.argv.includes('--check');
const write = process.argv.includes('--write');
if (check) {
  if (!fs.existsSync(LATEST)) throw new Error('latest.js is missing');
  const current = fs.readFileSync(LATEST, 'utf8');
  if (current !== built) throw new Error('latest.js differs from deterministic src bundle');
  console.log(`usage-dashboard bundle check: OK · ${manifest.parts.length} modules · ${version}`);
} else if (write) {
  fs.writeFileSync(LATEST, built);
  console.log(`usage-dashboard bundle written: ${manifest.parts.length} modules · ${version}`);
} else {
  process.stdout.write(built);
}
