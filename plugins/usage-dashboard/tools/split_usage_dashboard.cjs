const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {PARTS} = require('../src/parts.cjs');

const ROOT = path.resolve(__dirname, '..');
const LATEST = path.join(ROOT, 'latest.js');
const SRC = path.join(ROOT, 'src');
const source = fs.readFileSync(LATEST, 'utf8');
const positions = [0];
let previous = 0;

for (const part of PARTS.slice(1)) {
  const count = source.split(part.marker).length - 1;
  if (count !== 1) throw new Error(`${part.file}: marker count=${count}`);
  const index = source.indexOf(part.marker);
  if (index <= previous) throw new Error(`${part.file}: marker out of order`);
  positions.push(index);
  previous = index;
}
positions.push(source.length);

fs.mkdirSync(SRC, {recursive:true});
for (let i = 0; i < PARTS.length; i += 1) {
  const content = source.slice(positions[i], positions[i + 1]);
  if (!content.length) throw new Error(`${PARTS[i].file}: empty part`);
  fs.writeFileSync(path.join(SRC, PARTS[i].file), content);
}

execFileSync(process.execPath, [path.join(__dirname, 'build_usage_dashboard.cjs'), '--write'], {stdio:'inherit'});
console.log(`usage-dashboard recovery split: ${PARTS.length} modules`);
