const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const ROOT = process.cwd();
const helper = path.join(ROOT, 'plugins/usage-dashboard/tools/check_release_monotonic.py');
const workflowPath = path.join(ROOT, currentRelease.publisherWorkflow);
const promoterPath = path.join(ROOT, 'plugins/usage-dashboard/tools/promote_release_blobs.cjs');

assert.ok(fs.existsSync(helper), 'monotonic guard helper missing');
assert.ok(fs.existsSync(promoterPath), 'exact-byte promoter missing');
const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-dashboard-p22-'));

function writeArtifactSet(name, version, marker = name) {
  const pluginRoot = path.join(temp, name, 'plugins', 'usage-dashboard');
  const runtime = path.join(pluginRoot, 'runtime');
  fs.mkdirSync(runtime, {recursive: true});
  const engine = Buffer.from(`engine:${marker}\n`), manager = Buffer.from(`manager:${marker}\n`), bootstrap = Buffer.from(`bootstrap:${marker}\n`), latest = Buffer.from(`latest:${marker}\n`);
  fs.writeFileSync(path.join(runtime, 'bridge-engine.mjs'), engine);
  fs.writeFileSync(path.join(runtime, 'bridge-manager.cjs'), manager);
  fs.writeFileSync(path.join(runtime, 'bootstrap-bridge-manager.sh'), bootstrap);
  fs.writeFileSync(path.join(pluginRoot, 'latest.js'), latest);
  const manifest = {format:1,product:'Local Usage Dashboard',productVersion:version,releaseBranch:'release-usage-dashboard',components:{plugin:{mode:'bundled',version,artifact:'plugins/usage-dashboard/latest.js'},bridge:{mode:'sidecar',requiredVersion:'1.6.13',sha256:hash(engine)},bridgeManager:{mode:'sidecar-manager',version:'1.2.6',productVersion:version,sha256:hash(manager),bootstrapSha256:hash(bootstrap)}},contracts:{snapshot:1,recentRequest:1}};
  const manifestFile = path.join(runtime, 'product-manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  return {pluginRoot, runtime, manifestFile};
}
function runGuard(candidate, main, release, checkArtifacts = false) {
  const args = [helper,'--candidate-manifest',candidate.manifestFile,'--main-manifest',main.manifestFile,'--release-manifest',release.manifestFile];
  if (checkArtifacts) args.push('--candidate-runtime',candidate.runtime,'--release-runtime',release.runtime,'--check-artifacts');
  return spawnSync('python3', args, {encoding:'utf8'});
}

{
  const candidate=writeArtifactSet('allow-candidate','3.0.0-alpha.5.60','same-560'), main=writeArtifactSet('allow-main','3.0.0-alpha.5.60','same-560'), release=writeArtifactSet('allow-release','3.0.0-alpha.5.59','old-559');
  const result=runGuard(candidate,main,release,true); assert.equal(result.status,0,result.stderr||result.stdout); assert.match(result.stdout,/ALLOW:3\.0\.0-alpha\.5\.60/);
}
{
  const candidate=writeArtifactSet('stale-main-candidate','3.0.0-alpha.5.59','old-559'), main=writeArtifactSet('stale-main-current','3.0.0-alpha.5.60','same-560'), release=writeArtifactSet('stale-main-release','3.0.0-alpha.5.60','same-560');
  const result=runGuard(candidate,main,release,true); assert.equal(result.status,2,result.stderr||result.stdout); assert.match(result.stdout,/STALE_CANDIDATE_MAIN/);
}
{
  const candidate=writeArtifactSet('stale-release-candidate','3.0.0-alpha.5.60','same-560'), main=writeArtifactSet('stale-release-main','3.0.0-alpha.5.60','same-560'), release=writeArtifactSet('stale-release-current','3.0.0-alpha.5.61','new-561');
  const result=runGuard(candidate,main,release,true); assert.equal(result.status,2,result.stderr||result.stdout); assert.match(result.stdout,/STALE_CANDIDATE_RELEASE/);
}
{
  const candidate=writeArtifactSet('noop-candidate','3.0.0-alpha.5.60','identical'), main=writeArtifactSet('noop-main','3.0.0-alpha.5.60','identical'), release=writeArtifactSet('noop-release','3.0.0-alpha.5.60','identical');
  const result=runGuard(candidate,main,release,true); assert.equal(result.status,0,result.stderr||result.stdout); assert.match(result.stdout,/NOOP_IDENTICAL/);
}
{
  const candidate=writeArtifactSet('diverge-candidate','3.0.0-alpha.5.60','base'), main=writeArtifactSet('diverge-main','3.0.0-alpha.5.60','base'), release=writeArtifactSet('diverge-release','3.0.0-alpha.5.60','base');
  fs.writeFileSync(path.join(release.pluginRoot,'latest.js'),'latest:mutated-same-version\n');
  const result=runGuard(candidate,main,release,true); assert.equal(result.status,3,result.stderr||result.stdout); assert.match(result.stdout,/SAME_VERSION_ARTIFACT_DIVERGENCE/);
}
{
  const candidate=writeArtifactSet('ahead-candidate','3.0.0-alpha.5.61','new-561'), main=writeArtifactSet('ahead-main','3.0.0-alpha.5.60','same-560'), release=writeArtifactSet('ahead-release','3.0.0-alpha.5.59','old-559');
  const result=runGuard(candidate,main,release); assert.equal(result.status,4,result.stderr||result.stdout); assert.match(result.stdout,/CANDIDATE_AHEAD_OF_MAIN/);
}

const workflow = fs.readFileSync(workflowPath, 'utf8');
const promoter = fs.readFileSync(promoterPath, 'utf8');
assert.match(workflow, /group: usage-dashboard-release/);
assert.match(workflow, /promote_release_blobs\.cjs/);
assert.doesNotMatch(workflow, /repo-main-write\.py|git switch|git push|cp -R|build_bridge_engine\.cjs|build_usage_dashboard\.cjs/);
assert.ok(promoter.includes('STALE_CANDIDATE_RELEASE'));
assert.ok(promoter.includes('NOOP_IDENTICAL'));
assert.ok(promoter.includes('SAME_VERSION_ARTIFACT_DIVERGENCE'));
assert.ok(promoter.includes('RELEASE_REF_MOVED'));
assert.ok(promoter.includes('force:false'));

fs.rmSync(temp, {recursive:true, force:true});
console.log('usage-dashboard P22 monotonic release integrity: OK · legacy decisions retained and exact-byte promoter owns production mutation');
