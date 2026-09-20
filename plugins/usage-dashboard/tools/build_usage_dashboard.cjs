const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {LEGACY_ROOT, normalizeRoot} = require('./release_path_profile.cjs');

function parseArgs(argv = process.argv.slice(2)) {
  let mode = 'stdout';
  let sourceRoot = LEGACY_ROOT;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--write' || arg === '--check') {
      const nextMode = arg.slice(2);
      if (mode !== 'stdout' && mode !== nextMode) throw new Error('USAGE_DASHBOARD_BUILD_MODE_CONFLICT');
      mode = nextMode;
    } else if (arg === '--root') {
      sourceRoot = String(argv[++index] || '');
    } else {
      throw new Error(`USAGE_DASHBOARD_BUILD_ARGUMENT_DENIED:${arg}`);
    }
  }
  return {mode, sourceRoot:normalizeRoot(sourceRoot)};
}

const {mode, sourceRoot} = parseArgs();
const ROOT = path.resolve(sourceRoot);
const SRC = path.join(ROOT, 'src');
const MANIFEST = path.join(SRC, 'manifest.json');
const LATEST = path.join(ROOT, 'latest.js');
const {PARTS} = require(path.join(SRC, 'parts.cjs'));
const hash = (content) => crypto.createHash('sha256').update(content).digest('hex');
const WRITE = mode === 'write';

const partStates = PARTS.map((part) => {
  const file = path.join(SRC, part.file);
  if (!fs.existsSync(file)) throw new Error(`missing source part: ${part.file}`);
  let content = fs.readFileSync(file, 'utf8');
  if (!content.length) throw new Error(`empty source part: ${part.file}`);
  const normalized = content.replace(/\n+$/g, '\n');
  if (WRITE && normalized !== content) {
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
  source:`${sourceRoot}/latest.js`,
  sourceOfTruth:'modules',
  layout:`${sourceRoot}/src/parts.cjs`,
  artifactSha256:hash(built),
  parts:partStates.map(({content, marker, ...part}) => part)
};
const manifestText = JSON.stringify(generatedManifest, null, 2) + '\n';

if (mode === 'check') {
  if (!fs.existsSync(MANIFEST)) throw new Error('usage-dashboard src/manifest.json is missing');
  if (!fs.existsSync(LATEST)) throw new Error('usage-dashboard latest.js is missing');
  if (fs.readFileSync(MANIFEST, 'utf8') !== manifestText) throw new Error('manifest.json differs from generated modular manifest');
  if (fs.readFileSync(LATEST, 'utf8') !== built) throw new Error('latest.js differs from deterministic modular source bundle');
  console.log(`usage-dashboard source parity: OK · ${PARTS.length} modules · ${version}`);
  process.exit(0);
}

if (WRITE) {
  fs.writeFileSync(LATEST, built);
  fs.writeFileSync(MANIFEST, manifestText);
  console.log(`usage-dashboard bundle written from modules: ${PARTS.length} modules · ${version}`);
  process.exit(0);
}

process.stdout.write(built);
