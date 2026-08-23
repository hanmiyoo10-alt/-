#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function tupleFromManifest(manifest) {
  return [
    String(manifest?.productVersion || ''),
    String(manifest?.components?.bridge?.requiredVersion || ''),
    String(manifest?.components?.bridgeManager?.version || ''),
    Number(manifest?.contracts?.snapshot),
    Number(manifest?.contracts?.recentRequest),
  ];
}

function tupleFromSpec(spec) {
  return [
    String(spec?.productVersion || ''),
    String(spec?.engineVersion || ''),
    String(spec?.managerVersion || ''),
    Number(spec?.snapshotContract),
    Number(spec?.recentRequestContract),
  ];
}

function sameTuple(a, b) { return a.length === b.length && a.every((value, index) => value === b[index]); }

function resolveReleaseSpec({manifest, specs}) {
  if (manifest?.product !== 'Local Usage Dashboard') throw new Error('RELEASE_SPEC_MANIFEST_MISMATCH:unexpected-product');
  const target = tupleFromManifest(manifest);
  if (!target[0] || !target[1] || !target[2] || !Number.isFinite(target[3]) || !Number.isFinite(target[4])) {
    throw new Error('RELEASE_SPEC_MANIFEST_MISMATCH:incomplete-tuple');
  }
  const sameVersion = specs.filter(({spec}) => String(spec?.productVersion || '') === target[0]);
  const exact = sameVersion.filter(({spec}) => sameTuple(tupleFromSpec(spec), target));
  if (exact.length === 1) return exact[0].path;
  if (exact.length > 1) throw new Error(`RELEASE_SPEC_AMBIGUOUS:${target[0]}:${exact.map((item) => item.path).join(',')}`);
  if (sameVersion.length) throw new Error(`RELEASE_SPEC_MANIFEST_MISMATCH:${target[0]}`);
  throw new Error(`RELEASE_SPEC_NOT_FOUND:${target[0]}`);
}

function loadSpecs(root) {
  return fs.readdirSync(root).filter((name) => name.endsWith('.json')).sort().map((name) => {
    const file = path.join(root, name);
    return {path:path.posix.join('.github/usage-dashboard/releases', name), spec:JSON.parse(fs.readFileSync(file, 'utf8'))};
  });
}

function main() {
  const args = process.argv.slice(2);
  const value = (name, fallback) => { const index = args.indexOf(name); return index >= 0 ? String(args[index + 1] || '') : fallback; };
  const manifestPath = value('--manifest', 'plugins/usage-dashboard/runtime/product-manifest.json');
  const releasesRoot = value('--releases-root', '.github/usage-dashboard/releases');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  process.stdout.write(`${resolveReleaseSpec({manifest, specs:loadSpecs(releasesRoot)})}\n`);
}

module.exports = {tupleFromManifest, tupleFromSpec, sameTuple, resolveReleaseSpec, loadSpecs};
if (require.main === module) {
  try { main(); } catch (error) { console.error(error?.message || String(error)); process.exitCode = 1; }
}
