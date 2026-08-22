const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {PARTS} = require('../src/parts.cjs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const latest = fs.readFileSync(path.join(ROOT, 'latest.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const hash = (content) => crypto.createHash('sha256').update(content).digest('hex');

assert.equal(manifest.format, 1);
assert.equal(manifest.plugin, 'Local Usage Dashboard');
assert.equal(manifest.sourceOfTruth, 'modules');
assert.equal(manifest.layout, 'plugins/usage-dashboard/src/parts.cjs');
assert.equal(manifest.parts.length, PARTS.length);
assert.equal(new Set(PARTS.map((part) => part.file)).size, PARTS.length);

const chunks = [];
for (let i = 0; i < PARTS.length; i += 1) {
  const definition = PARTS[i];
  const declared = manifest.parts[i];
  assert.equal(declared.file, definition.file, `manifest order drift: ${definition.file}`);
  assert.equal(declared.label, definition.label, `manifest label drift: ${definition.file}`);
  const content = fs.readFileSync(path.join(SRC, definition.file), 'utf8');
  assert.ok(content.length > 0, `empty modular source: ${definition.file}`);
  if (definition.marker) assert.ok(content.startsWith(definition.marker), `boundary drift: ${definition.file}`);
  assert.equal(declared.bytes, Buffer.byteLength(content), `byte count drift: ${definition.file}`);
  assert.equal(declared.sha256, hash(content), `hash drift: ${definition.file}`);
  chunks.push(content);
}

const built = chunks.join('');
assert.equal(built, latest, 'latest.js must be byte-identical to modular source bundle');
assert.equal(manifest.artifactSha256, hash(built));
assert.equal(manifest.version, (built.match(/^\/\/@version (.+)$/m) || [])[1]);
assert.match(built, /const STATE_KEY = 'local-usage-dashboard-v3';/);
assert.match(built, /^\/\/@update-url https:\/\/raw\.githubusercontent\.com\/hanmiyoo10-alt\/-\/release-usage-dashboard\/plugins\/usage-dashboard\/latest\.js$/m);
assert.match(built, /Local runtime errors:/);
assert.match(built, /Refresh requests:/);

console.log(`usage-dashboard modular build v2: OK · ${PARTS.length} modules · ${manifest.version}`);
