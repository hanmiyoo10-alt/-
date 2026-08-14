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

const partStates = [];
for (const part of manifest.parts) {
  const file = path.join(SRC, String(part.file || ''));
  if (!fs.existsSync(file)) throw new Error(`missing source part: ${part.file}`);
  const content = fs.readFileSync(file, 'utf8');
  if (!content.length) throw new Error(`empty source part: ${part.file}`);
  partStates.push({
    ...part,
    content,
    bytes:Buffer.byteLength(content),
    sha256:crypto.createHash('sha256').update(content).digest('hex')
  });
}

const built = partStates.map(part => part.content).join('');
const artifactSha256 = crypto.createHash('sha256').update(built).digest('hex');
const version = (built.match(/^\/\/@version (.+)$/m) || [])[1] || 'unknown';
if (version === 'unknown') throw new Error('bundle version marker is missing');

const check = process.argv.includes('--check');
const write = process.argv.includes('--write');

if (check) {
  if (manifest.version !== version) throw new Error(`manifest version ${manifest.version} != bundle version ${version}`);
  if (manifest.artifactSha256 !== artifactSha256) throw new Error('bundle hash differs from manifest artifact hash');
  for (let i = 0; i < partStates.length; i += 1) {
    const expected = manifest.parts[i];
    const actual = partStates[i];
    if (expected.sha256 !== actual.sha256) throw new Error(`source part hash mismatch: ${actual.file}`);
    if (Number(expected.bytes) !== Number(actual.bytes)) throw new Error(`source part byte count mismatch: ${actual.file}`);
  }
  if (!fs.existsSync(LATEST)) throw new Error('latest.js is missing');
  const current = fs.readFileSync(LATEST, 'utf8');
  if (current !== built) throw new Error('latest.js differs from deterministic src bundle');
  console.log(`usage-dashboard bundle check: OK · ${manifest.parts.length} modules · ${version}`);
  process.exit(0);
}

if (write) {
  const nextManifest = {
    ...manifest,
    version,
    artifactSha256,
    parts:partStates.map(({content, ...part}) => part)
  };
  fs.writeFileSync(LATEST, built);
  fs.writeFileSync(MANIFEST, JSON.stringify(nextManifest, null, 2) + '\n');
  console.log(`usage-dashboard bundle written: ${manifest.parts.length} modules · ${version}`);
  process.exit(0);
}

process.stdout.write(built);
