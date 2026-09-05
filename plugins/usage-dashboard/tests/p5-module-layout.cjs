const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {PARTS} = require('../src/parts.cjs');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const engineSrc = path.join(root, 'runtime-src', 'bridge-engine');
const engineManifest = JSON.parse(fs.readFileSync(path.join(engineSrc, 'parts.json'), 'utf8'));

const pluginParts = PARTS.map((part) => part.file);
assert.ok(pluginParts.length > 0, 'plugin registry must not be empty');
assert.equal(new Set(pluginParts).size, pluginParts.length, 'plugin registry must be unique');
assert.deepEqual(pluginParts, [...pluginParts].sort(), 'plugin registry order must remain deterministic');
const actualPlugin = fs.readdirSync(src).filter((name) => name.endsWith('.part.js')).sort();
assert.deepEqual(actualPlugin, [...pluginParts].sort(), 'plugin registry/file parity drift');
for (const part of PARTS) {
  assert.match(part.file, /^[0-9]{2}-[a-z0-9-]+\.part\.js$/);
  if (part.marker) assert.ok(fs.readFileSync(path.join(src, part.file), 'utf8').startsWith(part.marker), `boundary drift: ${part.file}`);
}

const splitGroups = pluginParts.filter((name) => /^(?:00|02|04|06|08|10|12|14|15|16|18|42|50|52|54|62|70|72|74|76)-/.test(name));
for (const name of splitGroups) {
  const bytes = fs.statSync(path.join(src, name)).size;
  // 5.100 adds bounded source-backed model lifecycle metadata to the existing request-ledger owner.
  // Keep that owner under an explicit 38 KiB hard ceiling; all other split owners remain capped at 35 KiB.
  const maxBytes = name === '14-request-ledger.part.js' ? 38 * 1024 : 35 * 1024;
  assert.ok(bytes <= maxBytes, `${name} grew beyond ${maxBytes / 1024} KiB: ${bytes}`);
}

assert.equal(engineManifest.schemaVersion, 1);
assert.equal(engineManifest.mode, 'shared-lexical-concatenation');
assert.ok(Array.isArray(engineManifest.parts) && engineManifest.parts.length > 0, 'Engine parts registry must not be empty');
assert.equal(new Set(engineManifest.parts).size, engineManifest.parts.length, 'Engine parts registry must be unique');
assert.deepEqual(engineManifest.parts, [...engineManifest.parts].sort(), 'Engine registry order must remain deterministic');
const actualEngine = fs.readdirSync(engineSrc).filter((name) => name.endsWith('.part.mjs')).sort();
assert.deepEqual(actualEngine, [...engineManifest.parts].sort(), 'Engine registry/file parity drift');
for (const file of engineManifest.parts) assert.match(file, /^[0-9]{2}-[a-z0-9-]+\.part\.mjs$/);

console.log(`usage-dashboard P5 module layout: OK · plugin ${pluginParts.length} parts · Engine ${engineManifest.parts.length} parts · registry authority`);
