'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {LEGACY_ROOT, normalizeRoot} = require('./release_path_profile.cjs');

const hash = (content) => crypto.createHash('sha256').update(content).digest('hex');

function parseArgs(argv = process.argv.slice(2)) {
  let sourceRoot = LEGACY_ROOT;
  let write = false;
  let check = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') {
      if (!argv[index + 1]) throw new Error('USAGE_DASHBOARD_BUILD_ROOT_MISSING');
      sourceRoot = normalizeRoot(String(argv[++index]));
    } else if (arg === '--write') {
      write = true;
    } else if (arg === '--check') {
      check = true;
    } else {
      throw new Error(`USAGE_DASHBOARD_BUILD_ARGUMENT_DENIED:${arg}`);
    }
  }
  return Object.freeze({sourceRoot, write, check});
}

function buildForRoot(sourceRoot, {write = false, check = false} = {}) {
  const normalizedRoot = normalizeRoot(sourceRoot);
  const root = path.resolve(normalizedRoot);
  const src = path.join(root, 'src');
  const manifestPath = path.join(src, 'manifest.json');
  const latestPath = path.join(root, 'latest.js');
  const {PARTS} = require(path.join(src, 'parts.cjs'));

  const partStates = PARTS.map((part) => {
    const file = path.join(src, part.file);
    if (!fs.existsSync(file)) throw new Error(`missing source part: ${part.file}`);
    let content = fs.readFileSync(file, 'utf8');
    if (!content.length) throw new Error(`empty source part: ${part.file}`);
    const normalized = content.replace(/\n+$/g, '\n');
    if (write && normalized !== content) {
      fs.writeFileSync(file, normalized);
      content = normalized;
    }
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
    source:path.posix.join(normalizedRoot, 'latest.js'),
    sourceOfTruth:'modules',
    layout:path.posix.join(normalizedRoot, 'src/parts.cjs'),
    artifactSha256:hash(built),
    parts:partStates.map(({content, marker, ...part}) => part),
  };
  const manifestText = JSON.stringify(generatedManifest, null, 2) + '\n';

  if (check) {
    if (!fs.existsSync(manifestPath)) throw new Error('usage-dashboard src/manifest.json is missing');
    if (!fs.existsSync(latestPath)) throw new Error('usage-dashboard latest.js is missing');
    if (fs.readFileSync(manifestPath, 'utf8') !== manifestText) throw new Error('manifest.json differs from generated modular manifest');
    if (fs.readFileSync(latestPath, 'utf8') !== built) throw new Error('latest.js differs from deterministic modular source bundle');
    return {kind:'check', message:`usage-dashboard source parity: OK · ${PARTS.length} modules · ${version}`, built};
  }

  if (write) {
    fs.writeFileSync(latestPath, built);
    fs.writeFileSync(manifestPath, manifestText);
    return {kind:'write', message:`usage-dashboard bundle written from modules: ${PARTS.length} modules · ${version}`, built};
  }
  return {kind:'stdout', message:'', built};
}

function main() {
  const args = parseArgs();
  const result = buildForRoot(args.sourceRoot, args);
  if (result.kind === 'stdout') process.stdout.write(result.built);
  else console.log(result.message);
}

module.exports = {parseArgs, buildForRoot};
if (require.main === module) {
  try { main(); } catch (error) { console.error(error?.message || String(error)); process.exitCode = 1; }
}
