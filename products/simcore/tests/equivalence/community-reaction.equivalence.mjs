#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BundleLoader, HarnessError } from '../../tooling/bundle-loader.mjs';

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i].replace(/^--/, '')] = argv[i + 1];
  return out;
}
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function version(text) { return text.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || null; }
function read(file, expectedVersion) {
  const text = fs.readFileSync(file, 'utf8');
  if (version(text) !== expectedVersion) throw new HarnessError('HISTORICAL_SOURCE_HASH_MISMATCH', `${file}: expected v${expectedVersion}`);
  return text;
}
function physicalStarterLines(text) {
  return String(text).split(/\r?\n/).filter((line) => /^\s*(?:-\s+|ㄴ\s+)/.test(line));
}
function inspectOld(source, fixture) {
  const reaction = new BundleLoader(source).load('reaction');
  const lines = physicalStarterLines(fixture);
  const inspections = lines.map((line) => reaction.inspectCommentReactionLine(line));
  return { units: lines.length, missing: inspections.filter((x) => x.failureReason === 'MISSING').length, pass: inspections.filter((x) => x.ok).length };
}
function inspectLogical(source, fixture) {
  const loader = new BundleLoader(source);
  const community = loader.load('community');
  const reaction = loader.load('reaction');
  const units = community.commentUnits(fixture);
  const inspections = units.map((unit) => reaction.inspectCommentReactionLine(unit.text));
  return { units: units.length, missing: inspections.filter((x) => x.failureReason === 'MISSING').length, pass: inspections.filter((x) => x.ok).length };
}

const a = args(process.argv.slice(2));
if (!a.old || !a.fixed || !a.current || !a.fixture || !a.report) throw new HarnessError('INVOCATION_ERROR', 'required: --old --fixed --current --fixture --report');
const fixtureDoc = JSON.parse(fs.readFileSync(a.fixture, 'utf8'));
const fixture = fixtureDoc.input.section4Top1Reply;
const oldSource = read(a.old, '0.64.4');
const fixedSource = read(a.fixed, '0.64.5');
const currentSource = read(a.current, '0.64.6');
const oldResult = inspectOld(oldSource, fixture);
const fixedResult = inspectLogical(fixedSource, fixture);
const currentResult = inspectLogical(currentSource, fixture);
if (oldResult.units !== 5 || oldResult.missing !== 5 || oldResult.pass !== 0) throw new HarnessError('OUTCOME_MISMATCH', `v0.64.4 differential: ${JSON.stringify(oldResult)}`);
for (const [label, result] of [['v0.64.5', fixedResult], ['current', currentResult]]) {
  if (result.units !== 5 || result.missing !== 0 || result.pass !== 5) throw new HarnessError('OUTCOME_MISMATCH', `${label}: ${JSON.stringify(result)}`);
}
const report = {
  equivalenceVersion: 1,
  assertionId: 'community.multiline-bilingual-logical-unit-pass',
  result: 'COMPATIBLE_SUPERSET',
  retirementEligible: true,
  dimensions: { input: 'PASS', outcome: 'PASS', negative: 'PASS', execution: 'DIRECT_OWNER_MATCH' },
  historical: {
    v0644: { version: '0.64.4', sha256: sha256(oldSource), outcome: oldResult },
    v0645: { version: '0.64.5', sha256: sha256(fixedSource), outcome: fixedResult }
  },
  current: { version: '0.64.6', sha256: sha256(currentSource), outcome: currentResult }
};
fs.writeFileSync(a.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log('COMMUNITY v0.64.4 -> v0.64.5 -> current differential: PASS');
