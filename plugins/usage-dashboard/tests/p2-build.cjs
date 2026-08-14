const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const latest = fs.readFileSync(path.join(ROOT, 'latest.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));

assert.equal(manifest.format, 1);
assert.equal(manifest.plugin, 'Local Usage Dashboard');
assert.equal(manifest.parts.length, 10);
assert.equal(new Set(manifest.parts.map(part => part.file)).size, manifest.parts.length);

const expectedStarts = {
  '10-usage-data.part.js':'  function recentRequestValue(row, keys, fallback = null) {',
  '20-bridge-io.part.js':'  async function fetchSnapshot() {',
  '30-refresh-runtime.part.js':"  async function refresh(reason = 'manual', silent = false) {",
  '40-diagnostics.part.js':'  function diagText() {',
  '50-settings-ui.part.js':'  function settingsHtml() {',
  '60-settings-runtime.part.js':'  function renderSettings() {',
  '70-floating-widget.part.js':'  function widgetHtml() {',
  '80-lifecycle.part.js':'  function scheduleRefresh() {',
  '90-bootstrap.part.js':"  try {\n    store=await Risuai.getLocalPluginStorage();"
};

const chunks = [];
for (const part of manifest.parts) {
  const file = path.join(SRC, part.file);
  assert.ok(fs.existsSync(file), `missing modular source: ${part.file}`);
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.length > 0, `empty modular source: ${part.file}`);
  if (expectedStarts[part.file]) assert.ok(content.startsWith(expectedStarts[part.file]), `boundary drift: ${part.file}`);
  const bytes = Buffer.byteLength(content);
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  assert.equal(bytes, part.bytes, `byte count drift: ${part.file}`);
  assert.equal(sha256, part.sha256, `hash drift: ${part.file}`);
  chunks.push(content);
}

const built = chunks.join('');
assert.equal(built, latest, 'latest.js must be byte-identical to modular source bundle');
assert.equal(crypto.createHash('sha256').update(built).digest('hex'), manifest.artifactSha256);
const version = (built.match(/^\/\/@version (.+)$/m) || [])[1];
assert.equal(version, manifest.version);
assert.match(built, /const STATE_KEY = 'local-usage-dashboard-v3';/);
assert.match(built, /^\/\/@update-url https:\/\/raw\.githubusercontent\.com\/hanmiyoo10-alt\/-\/release-usage-dashboard\/plugins\/usage-dashboard\/latest\.js$/m);
assert.match(built, /Resume route: requested/);
assert.match(built, /Bridge module freshness:/);
assert.match(built, /Usage detail:/);

console.log(`usage-dashboard modular build regression: OK · ${manifest.parts.length} modules · ${version}`);
