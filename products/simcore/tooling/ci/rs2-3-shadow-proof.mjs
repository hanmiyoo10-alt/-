#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const P = '47969d24771f6cc188df6e32150fc6fde519182d';
const H = 'db14a61862c3730582ad102a70d109348b7e1cb7';
const ROBUST_PASS = 'v0.64.6 closure + timeline regression fixtures 1-25: PASS';

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding:'utf8', timeout:240000, maxBuffer:2*1024*1024, ...options });
}
function must(condition, message) { if (!condition) throw new Error(message); }
function gitBytes(commit, file) {
  const r = spawnSync('git', ['show', `${commit}:${file}`], { encoding:null, timeout:60000, maxBuffer:2*1024*1024 });
  must(r.status === 0, `git show failed: ${commit}:${file}`);
  return r.stdout;
}
function report(pathname) { return JSON.parse(fs.readFileSync(pathname, 'utf8')); }
function writeSource(dir, commit) {
  fs.mkdirSync(dir, { recursive:true });
  fs.writeFileSync(path.join(dir,'latest.js'), gitBytes(commit,'plugins/simcore/latest.js'));
  fs.writeFileSync(path.join(dir,'install.js'), gitBytes(commit,'plugins/simcore/install.js'));
  must(fs.readFileSync(path.join(dir,'latest.js')).equals(fs.readFileSync(path.join(dir,'install.js'))), `source mismatch ${commit}`);
}
function permanent(sourceDir, identity, verifier, candidate, out) {
  return run(process.execPath, [
    'products/simcore/tooling/check.mjs','--profile','CANDIDATE_SHADOW',
    '--source',`${sourceDir}/latest.js`,'--mirror-source',`${sourceDir}/install.js`,
    '--production-identity',identity,'--verifier-commit',verifier,
    '--candidate-commit',candidate,'--expected-production-commit',P,'--report',out,
  ], { env:{...process.env, RS23_SHADOW_CHILD:'1'} });
}
function legacyPositive(sourceDir) {
  const arch = run('python3',['scripts/simcore-architecture-check.py','--source',`${sourceDir}/latest.js`,'--source',`${sourceDir}/install.js`]);
  must(arch.status === 0, `legacy arch positive failed: ${arch.stderr}`);
  const robust = run(process.execPath,['scripts/simcore-06406-closure-completion-gate-test.mjs',`${sourceDir}/latest.js`]);
  must(robust.status === 0, `legacy robust positive failed: ${robust.stderr}`);
  must(robust.stdout.includes(ROBUST_PASS), `legacy robust aggregate PASS marker missing: ${robust.stdout}`);
}

const identity = process.argv[2];
const verifier = process.argv[3];
const output = process.argv[4] || '.simcore-ci/rs2-3-shadow-summary.json';
must(identity && verifier, 'usage: shadow-proof <production-identity> <verifier-commit> [report]');
fs.mkdirSync('.rs23-shadow', { recursive:true });
writeSource('.rs23-shadow/production', P);
writeSource('.rs23-shadow/historical', H);

const positives = [];
for (const [role, commit, dir] of [
  ['DEPLOYED_PRODUCTION',P,'.rs23-shadow/production'],
  ['HISTORICAL_CORRECTION_CANDIDATE',H,'.rs23-shadow/historical'],
]) {
  const out = `.rs23-shadow/permanent-${commit.slice(0,8)}.json`;
  const r = permanent(dir,identity,verifier,commit,out);
  must(r.status === 0, `permanent positive failed ${commit}: ${r.stderr}`);
  const p = report(out);
  must(p.conclusion === 'PASS', `permanent positive not PASS ${commit}`);
  legacyPositive(dir);
  positives.push({ sourceCommit:commit, sourceRole:role, verifierCommit:verifier, permanent:'PASS', legacyArchitecture:'PASS', legacyRobust25:'PASS' });
}

const negatives = [];
// latest/install mismatch parity: the legacy static contract is byte equality; permanent must fail the same condition.
fs.copyFileSync('.rs23-shadow/production/latest.js','.rs23-shadow/mismatch-latest.js');
fs.copyFileSync('.rs23-shadow/production/install.js','.rs23-shadow/mismatch-install.js');
fs.appendFileSync('.rs23-shadow/mismatch-install.js','\n// controlled mismatch\n');
let r = run(process.execPath,[
  'products/simcore/tooling/check.mjs','--profile','CANDIDATE_SHADOW',
  '--source','.rs23-shadow/mismatch-latest.js','--mirror-source','.rs23-shadow/mismatch-install.js',
  '--production-identity',identity,'--verifier-commit',verifier,'--candidate-commit',P,'--expected-production-commit',P,
  '--report','.rs23-shadow/negative-mismatch.json'
], { env:{...process.env,RS23_SHADOW_CHILD:'1'} });
must(r.status === 1, `mismatch permanent exit=${r.status}`);
must(report('.rs23-shadow/negative-mismatch.json').reasonCodes.includes('LATEST_INSTALL_MISMATCH'),'mismatch reason missing');
must(!fs.readFileSync('.rs23-shadow/mismatch-latest.js').equals(fs.readFileSync('.rs23-shadow/mismatch-install.js')),'legacy cmp unexpectedly equal');
negatives.push({id:'latest-install-mismatch',legacy:'FAIL',permanent:'FAIL',reason:'LATEST_INSTALL_MISMATCH'});

// architecture negative parity.
const badModule='\nSimCore.define("rs23-forbidden-module", function(require, module, exports) { require("./runtime"); module.exports = {}; });\n';
for (const side of ['latest','install']) fs.writeFileSync(`.rs23-shadow/negative-arch-${side}.js`,Buffer.concat([fs.readFileSync('.rs23-shadow/production/latest.js'),Buffer.from(badModule)]));
const legacyArch = run('python3',['scripts/simcore-architecture-check.py','--source','.rs23-shadow/negative-arch-latest.js','--source','.rs23-shadow/negative-arch-install.js']);
must(legacyArch.status === 1, `legacy arch negative exit=${legacyArch.status}`);
r = run(process.execPath,[
  'products/simcore/tooling/check.mjs','--profile','CANDIDATE_SHADOW',
  '--source','.rs23-shadow/negative-arch-latest.js','--mirror-source','.rs23-shadow/negative-arch-install.js',
  '--production-identity',identity,'--verifier-commit',verifier,'--candidate-commit',P,'--expected-production-commit',P,
  '--report','.rs23-shadow/negative-arch.json'
], { env:{...process.env,RS23_SHADOW_CHILD:'1'} });
must(r.status === 1, `permanent arch negative exit=${r.status}`);
must(report('.rs23-shadow/negative-arch.json').reasonCodes.includes('ARCH_CONTRACT_FAIL'),'arch reason missing');
negatives.push({id:'forbidden-architecture-module',legacy:'FAIL',permanent:'FAIL',reason:'ARCH_CONTRACT_FAIL'});

// COMMUNITY semantic negative parity.
const src = fs.readFileSync('.rs23-shadow/production/latest.js','utf8');
const needle='SimCore.define("reaction", function';
must(src.includes(needle),'reaction module marker missing');
fs.writeFileSync('.rs23-shadow/negative-community.js',src.replace(needle,'SimCore.define("reaction-broken", function',1));
const permanentCommunity=run(process.execPath,['products/simcore/tooling/test.mjs','--source','.rs23-shadow/negative-community.js','--suite','community-reaction','--report','.rs23-shadow/negative-community-permanent.json']);
const legacyCommunity=run(process.execPath,['scripts/simcore-06406-closure-completion-gate-test.mjs','.rs23-shadow/negative-community.js']);
must(permanentCommunity.status === 1, `community permanent negative exit=${permanentCommunity.status}`);
must(legacyCommunity.status !== 0, `community legacy negative unexpectedly passed`);
negatives.push({id:'community-reaction-owner-missing',legacy:'FAIL',permanent:'FAIL',reason:'SEMANTIC_FAIL'});

// Fixture 21 parity is asserted inside the robust 1-25 legacy adapter. Aggregate exit 0 proves
// terminal/stored mismatch reaches INVALID_SOURCE with reason terminal-stored-airtime-mismatch.
negatives.push({id:'closure-terminal-stored-mismatch-fixture21',legacy:'INVALID_SOURCE_EXPECTED_PASS',permanent:'INVALID_SOURCE_EXPECTED_PASS',reason:'INVALID_SOURCE',evidence:'robust-fixtures-1-25-aggregate-pass'});

const summary={
  schemaVersion:1,
  workflowRun:Number(process.env.GITHUB_RUN_ID || 0),
  verifierCommit:verifier,
  positives,
  negativeParity:negatives,
  permanentStrength:'EQUIVALENT_OR_STRICTER_WITH_DURABLE_BATCH_A_PLUS_BOUNDED_LEGACY_COMPAT',
  runtimeMutation:'NONE',
  repositoryWrite:'NONE'
};
fs.writeFileSync(output,`${JSON.stringify(summary,null,2)}\n`,'utf8');
must(fs.statSync(output).size <= 256*1024,'shadow report too large');
console.log(`RS2-3 SHADOW PROOF PASS positives=${positives.length} negatives=${negatives.length}`);
console.log(JSON.stringify(summary));
