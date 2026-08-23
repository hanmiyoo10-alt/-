'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const root = path.resolve('plugins/usage-dashboard');
const sourceDir = path.join(root, 'runtime-src', 'bridge-engine');
const manifestPath = path.join(sourceDir, 'parts.json');

function fail(message) {
  console.error(`bridge-engine build: ${message}`);
  process.exit(1);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function loadManifest() {
  if (!fs.existsSync(manifestPath)) fail(`missing manifest ${path.relative(process.cwd(), manifestPath)}`);
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (error) { fail(`invalid parts manifest: ${error.message}`); }
  if (manifest.schemaVersion !== 1) fail(`unsupported manifest schema ${manifest.schemaVersion}`);
  if (manifest.mode !== 'shared-lexical-concatenation') fail(`unexpected build mode ${manifest.mode}`);
  if (!Array.isArray(manifest.parts) || !manifest.parts.length) fail('parts manifest is empty');
  if (new Set(manifest.parts).size !== manifest.parts.length) fail('parts manifest contains duplicates');
  for (const entry of manifest.parts) {
    if (!/^[0-9]{2}-[a-z0-9-]+[.]part[.]mjs$/.test(String(entry))) fail(`invalid part name ${entry}`);
  }
  const artifact = path.resolve(String(manifest.artifact || ''));
  const expectedArtifact = path.join(root, 'runtime', 'bridge-engine.mjs');
  if (artifact !== expectedArtifact) fail(`artifact path must remain ${path.relative(process.cwd(), expectedArtifact)}`);
  return {manifest, artifact};
}

function buildBuffer(manifest) {
  const listed = manifest.parts.slice();
  const actual = fs.readdirSync(sourceDir)
    .filter(name => name.endsWith('.part.mjs'))
    .sort();
  const expected = listed.slice().sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`part set mismatch; expected ${expected.join(', ')}, found ${actual.join(', ')}`);
  }
  const chunks = listed.map((entry, index) => {
    const file = path.join(sourceDir, entry);
    if (!fs.existsSync(file)) fail(`missing part ${entry}`);
    const value = fs.readFileSync(file);
    if (!value.length) fail(`empty part ${entry}`);
    if (index === 0 && !value.toString('utf8', 0, Math.min(value.length, 64)).startsWith('#!/usr/bin/env node\n')) {
      fail('first part must own the Engine shebang');
    }
    if (index > 0 && value.toString('utf8', 0, Math.min(value.length, 64)).startsWith('#!')) {
      fail(`only the first part may contain a shebang: ${entry}`);
    }
    return value;
  });
  return Buffer.concat(chunks);
}

function syntaxCheck(artifact) {
  const result = spawnSync(process.execPath, ['--check', artifact], {encoding:'utf8'});
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    fail(`node --check failed for ${path.relative(process.cwd(), artifact)}`);
  }
}

const mode = process.argv[2] || '--check';
if (!['--write', '--check'].includes(mode)) fail(`usage: node build_bridge_engine.cjs [--write|--check]`);
const {manifest, artifact} = loadManifest();
const first = buildBuffer(manifest);
const second = buildBuffer(manifest);
const firstSha = sha256(first);
const secondSha = sha256(second);
if (firstSha !== secondSha || !first.equals(second)) fail('non-deterministic rebuild detected');

if (mode === '--write') {
  fs.mkdirSync(path.dirname(artifact), {recursive:true});
  fs.writeFileSync(artifact, first);
  syntaxCheck(artifact);
  console.log(`bridge-engine build written: ${manifest.parts.length} parts · sha256 ${firstSha}`);
  process.exit(0);
}

if (!fs.existsSync(artifact)) fail(`generated artifact missing: ${path.relative(process.cwd(), artifact)}`);
const current = fs.readFileSync(artifact);
if (!current.equals(first)) {
  fail(`generated artifact drift: run build_bridge_engine.cjs --write (expected ${firstSha}, found ${sha256(current)})`);
}
syntaxCheck(artifact);
console.log(`bridge-engine source parity: OK · ${manifest.parts.length} parts · sha256 ${firstSha}`);
