const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const LATEST = path.join(ROOT, 'latest.js');
const SRC = path.join(ROOT, 'src');
const MANIFEST = path.join(SRC, 'manifest.json');

const parts = [
  {file:'00-runtime-core.part.js', marker:null, label:'runtime/core'},
  {file:'10-usage-data.part.js', marker:'  function recentRequestValue(row, keys, fallback = null) {', label:'usage normalization'},
  {file:'20-bridge-io.part.js', marker:'  async function fetchSnapshot() {', label:'bridge I/O'},
  {file:'30-refresh-runtime.part.js', marker:"  async function refresh(reason = 'manual', silent = false) {", label:'refresh runtime'},
  {file:'40-diagnostics.part.js', marker:'  function diagText() {', label:'diagnostics'},
  {file:'50-settings-ui.part.js', marker:'  function settingsHtml() {', label:'settings UI'},
  {file:'60-settings-runtime.part.js', marker:'  function renderSettings() {', label:'settings runtime'},
  {file:'70-floating-widget.part.js', marker:'  function widgetHtml() {', label:'floating widget'},
  {file:'80-lifecycle.part.js', marker:'  function scheduleRefresh() {', label:'lifecycle/scheduling'},
  {file:'90-bootstrap.part.js', marker:"  try {\n    store=await Risuai.getLocalPluginStorage();", label:'bootstrap/unload'}
];

const source = fs.readFileSync(LATEST, 'utf8');
const positions = [0];
let previous = 0;
for (const part of parts.slice(1)) {
  const count = source.split(part.marker).length - 1;
  if (count !== 1) throw new Error(`${part.file}: marker count=${count}`);
  const index = source.indexOf(part.marker);
  if (index <= previous) throw new Error(`${part.file}: marker out of order`);
  positions.push(index);
  previous = index;
}
positions.push(source.length);

fs.mkdirSync(SRC, {recursive:true});
const manifestParts = [];
for (let i = 0; i < parts.length; i += 1) {
  const part = parts[i];
  const content = source.slice(positions[i], positions[i + 1]);
  if (!content.length) throw new Error(`${part.file}: empty part`);
  fs.writeFileSync(path.join(SRC, part.file), content);
  manifestParts.push({
    file:part.file,
    label:part.label,
    bytes:Buffer.byteLength(content),
    sha256:crypto.createHash('sha256').update(content).digest('hex')
  });
}

const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || 'unknown';
const manifest = {
  format:1,
  plugin:'Local Usage Dashboard',
  version,
  source:'plugins/usage-dashboard/latest.js',
  artifactSha256:crypto.createHash('sha256').update(source).digest('hex'),
  parts:manifestParts
};
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`usage-dashboard split: ${parts.length} modules · ${version}`);
