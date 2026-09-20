'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {LEGACY_ROOT, normalizeRoot} = require('./release_path_profile.cjs');

function parseArgs(argv = process.argv.slice(2)) {
  let sourceRoot = LEGACY_ROOT;
  let mode = '--check';
  let modeSeen = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') {
      if (!argv[index + 1]) throw new Error('BRIDGE_ENGINE_BUILD_ROOT_MISSING');
      sourceRoot = normalizeRoot(String(argv[++index]));
    } else if (arg === '--write' || arg === '--check') {
      if (modeSeen) throw new Error('bridge-engine build: choose one mode');
      mode = arg;
      modeSeen = true;
    } else {
      throw new Error(`bridge-engine build: argument denied ${arg}`);
    }
  }
  return Object.freeze({sourceRoot, mode});
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function loadManifest(sourceRoot) {
  const normalizedRoot = normalizeRoot(sourceRoot);
  const root = path.resolve(normalizedRoot);
  const sourceDir = path.join(root, 'runtime-src', 'bridge-engine');
  const manifestPath = path.join(sourceDir, 'parts.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`bridge-engine build: missing manifest ${path.relative(process.cwd(), manifestPath)}`);
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
  catch (error) { throw new Error(`bridge-engine build: invalid parts manifest: ${error.message}`); }
  if (manifest.schemaVersion !== 1) throw new Error(`bridge-engine build: unsupported manifest schema ${manifest.schemaVersion}`);
  if (manifest.mode !== 'shared-lexical-concatenation') throw new Error(`bridge-engine build: unexpected build mode ${manifest.mode}`);
  if (!Array.isArray(manifest.parts) || !manifest.parts.length) throw new Error('bridge-engine build: parts manifest is empty');
  if (new Set(manifest.parts).size !== manifest.parts.length) throw new Error('bridge-engine build: parts manifest contains duplicates');
  for (const entry of manifest.parts) {
    if (!/^[0-9]{2}-[a-z0-9-]+[.]part[.]mjs$/.test(String(entry))) throw new Error(`bridge-engine build: invalid part name ${entry}`);
  }
  const artifact = path.resolve(String(manifest.artifact || ''));
  const expectedArtifact = path.join(root, 'runtime', 'bridge-engine.mjs');
  if (artifact !== expectedArtifact) {
    throw new Error(`bridge-engine build: artifact path must remain ${path.posix.join(normalizedRoot, 'runtime/bridge-engine.mjs')}`);
  }
  return {normalizedRoot, root, sourceDir, manifest, artifact};
}

function buildBuffer(manifest, sourceDir) {
  const listed = manifest.parts.slice();
  const actual = fs.readdirSync(sourceDir).filter(name => name.endsWith('.part.mjs')).sort();
  const expected = listed.slice().sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`bridge-engine build: part set mismatch; expected ${expected.join(', ')}, found ${actual.join(', ')}`);
  }
  const chunks = listed.map((entry, index) => {
    const file = path.join(sourceDir, entry);
    if (!fs.existsSync(file)) throw new Error(`bridge-engine build: missing part ${entry}`);
    const value = fs.readFileSync(file);
    if (!value.length) throw new Error(`bridge-engine build: empty part ${entry}`);
    if (index === 0 && !value.toString('utf8', 0, Math.min(value.length, 64)).startsWith('#!/usr/bin/env node\n')) {
      throw new Error('bridge-engine build: first part must own the Engine shebang');
    }
    if (index > 0 && value.toString('utf8', 0, Math.min(value.length, 64)).startsWith('#!')) {
      throw new Error(`bridge-engine build: only the first part may contain a shebang: ${entry}`);
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
    throw new Error(`bridge-engine build: node --check failed for ${path.relative(process.cwd(), artifact)}`);
  }
}

function buildForRoot(sourceRoot, mode = '--check') {
  const {sourceDir, manifest, artifact} = loadManifest(sourceRoot);
  const first = buildBuffer(manifest, sourceDir);
  const second = buildBuffer(manifest, sourceDir);
  const firstSha = sha256(first);
  const secondSha = sha256(second);
  if (firstSha !== secondSha || !first.equals(second)) throw new Error('bridge-engine build: non-deterministic rebuild detected');

  if (mode === '--write') {
    fs.mkdirSync(path.dirname(artifact), {recursive:true});
    fs.writeFileSync(artifact, first);
    syntaxCheck(artifact);
    return `bridge-engine build written: ${manifest.parts.length} parts · sha256 ${firstSha}`;
  }
  if (mode !== '--check') throw new Error(`bridge-engine build: unsupported mode ${mode}`);
  if (!fs.existsSync(artifact)) throw new Error(`bridge-engine build: generated artifact missing: ${path.relative(process.cwd(), artifact)}`);
  const current = fs.readFileSync(artifact);
  if (!current.equals(first)) {
    throw new Error(`bridge-engine build: generated artifact drift: run build_bridge_engine.cjs --write (expected ${firstSha}, found ${sha256(current)})`);
  }
  syntaxCheck(artifact);
  return `bridge-engine source parity: OK · ${manifest.parts.length} parts · sha256 ${firstSha}`;
}

function main() {
  const {sourceRoot, mode} = parseArgs();
  console.log(buildForRoot(sourceRoot, mode));
}

module.exports = {parseArgs, loadManifest, buildForRoot};
if (require.main === module) {
  try { main(); } catch (error) { console.error(error?.message || String(error)); process.exitCode = 1; }
}
