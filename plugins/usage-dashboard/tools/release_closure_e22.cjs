'use strict';

const versionOrder = require('./release_version_order.cjs');

const SHA_RE = /^[0-9a-f]{40}$/;
const PHYSICAL_MARKER = 'UD_PHYSICAL_ACCEPTANCE_V1';
const DEPLOY_MARKER = 'UD_RELEASE_DEPLOYED';
const PHYSICAL_VERDICTS = new Set(['ACCEPTED','REJECTED']);
const OBSERVED_STATES = new Set(['PASS','FAIL','UNKNOWN']);
const RECEIPT_KEYS = new Set([
  'release','release_branch_sha','verdict','observed_product','observed_engine','observed_manager',
  'health','feature','recorded_from','source_evidence','note',
]);

function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function finding(code, detail = '') { return Object.freeze({code, detail:String(detail || '')}); }
function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (!isObject(value)) return value;
  const out = {};
  for (const [key,item] of Object.entries(value)) out[key] = freeze(item);
  return Object.freeze(out);
}
function lines(body) { return String(body || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }
function hasLine(body, marker) { return lines(body).includes(marker); }
function parseFieldMap(body, marker) {
  const rows = lines(body);
  const start = rows.indexOf(marker);
  if (start < 0) return null;
  const fields = {};
  for (const row of rows.slice(start + 1)) {
    const match = /^([a-z_]+):\s*(.*?)$/.exec(row);
    if (!match) continue;
    const [,key,value] = match;
    if (Object.hasOwn(fields,key)) return {error:`duplicate:${key}`};
    fields[key] = value;
  }
  return {fields};
}
function normalizeManifest(manifest) {
  if (!isObject(manifest)) return null;
  return freeze({
    productVersion:String(manifest.productVersion || ''),
    engineVersion:String(manifest.engineVersion || manifest.components?.bridge?.requiredVersion || ''),
    managerVersion:String(manifest.managerVersion || manifest.components?.bridgeManager?.version || ''),
    contracts:isObject(manifest.contracts) ? {snapshot:manifest.contracts.snapshot,recentRequest:manifest.contracts.recentRequest} : null,
  });
}
function normalizeSpecIdentity(spec) {
  if (!isObject(spec)) return null;
  return freeze({
    productVersion:String(spec.productVersion || ''),
    engineVersion:String(spec.engineVersion || ''),
    managerVersion:String(spec.managerVersion || ''),
    contracts:isObject(spec.contracts) ? {snapshot:spec.contracts.snapshot,recentRequest:spec.contracts.recentRequest} : null,
  });
}
function sameContracts(a,b) { return Boolean(a && b && a.snapshot === b.snapshot && a.recentRequest === b.recentRequest); }

function inspectPhysicalReceipt(comment) {
  const findings = [];
  const parsed = parseFieldMap(comment?.body, PHYSICAL_MARKER);
  if (!parsed) return freeze({present:false, receipt:null, findings});
  if (parsed.error) return freeze({present:true, receipt:null, findings:[finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID',parsed.error)]});
  const fields = parsed.fields;
  for (const key of Object.keys(fields)) if (!RECEIPT_KEYS.has(key)) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID',`unknown:${key}`));
  for (const key of ['release','release_branch_sha','verdict','observed_product','observed_engine','observed_manager','health','feature','recorded_from']) {
    if (!fields[key]) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID',`missing:${key}`));
  }
  if (!versionOrder.parseReleaseVersion(fields.release)) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID','release'));
  if (!SHA_RE.test(String(fields.release_branch_sha || ''))) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID','release_branch_sha'));
  if (!PHYSICAL_VERDICTS.has(fields.verdict)) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID','verdict'));
  if (fields.observed_product !== 'UNKNOWN' && !versionOrder.parseReleaseVersion(fields.observed_product)) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID','observed_product'));
  if (!OBSERVED_STATES.has(fields.health)) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID','health'));
  if (!OBSERVED_STATES.has(fields.feature)) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID','feature'));
  if (fields.recorded_from !== 'user-real-device-evidence') findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID','recorded_from'));
  if (fields.source_evidence && fields.source_evidence.length > 240) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID','source_evidence'));
  if (fields.note && fields.note.length > 480) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID','note'));
  const commentId = Number(comment?.id);
  if (!Number.isSafeInteger(commentId) || commentId < 1) findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID','comment_id'));
  if (findings.length) return freeze({present:true, receipt:null, findings});
  return freeze({present:true, receipt:{
    release:fields.release,
    releaseBranchSha:fields.release_branch_sha,
    verdict:fields.verdict,
    observedProduct:fields.observed_product,
    observedEngine:fields.observed_engine,
    observedManager:fields.observed_manager,
    health:fields.health,
    feature:fields.feature,
    recordedFrom:fields.recorded_from,
    sourceEvidence:fields.source_evidence || '',
    note:fields.note || '',
    commentId,
  }, findings:[]});
}

function renderPhysicalAcceptanceReceipt(input) {
  const body = [
    PHYSICAL_MARKER,
    `release: ${input.release}`,
    `release_branch_sha: ${input.releaseBranchSha}`,
    `verdict: ${input.verdict}`,
    `observed_product: ${input.observedProduct ?? 'UNKNOWN'}`,
    `observed_engine: ${input.observedEngine ?? 'UNKNOWN'}`,
    `observed_manager: ${input.observedManager ?? 'UNKNOWN'}`,
    `health: ${input.health ?? 'UNKNOWN'}`,
    `feature: ${input.feature ?? 'UNKNOWN'}`,
    'recorded_from: user-real-device-evidence',
  ];
  if (input.sourceEvidence) body.push(`source_evidence: ${input.sourceEvidence}`);
  if (input.note) body.push(`note: ${input.note}`);
  const probe = inspectPhysicalReceipt({id:1,body:body.join('\n')});
  if (probe.findings.length) {
    const error = new Error(`E22_PHYSICAL_RECEIPT_RENDER_INVALID:${probe.findings.map((row)=>row.detail).join(',')}`);
    error.findings = probe.findings;
    throw error;
  }
  return body.join('\n');
}

function deploymentReceipts(comments, releaseVersion) {
  const receipts = [];
  for (const comment of Array.isArray(comments) ? comments : []) {
    if (!hasLine(comment?.body, DEPLOY_MARKER)) continue;
    const parsed = parseFieldMap(comment.body, DEPLOY_MARKER);
    if (!parsed || parsed.error) continue;
    const f = parsed.fields;
    if (f.release !== releaseVersion) continue;
    if (!SHA_RE.test(String(f.main_merge_sha || '')) || !SHA_RE.test(String(f.release_branch_sha || '')) || f.exact_byte_parity !== 'VERIFIED') continue;
    receipts.push(freeze({release:f.release, mainMergeSha:f.main_merge_sha, releaseBranchSha:f.release_branch_sha, parity:f.exact_byte_parity, commentId:Number(comment.id)||null}));
  }
  return receipts;
}
function uniqueDeployment(receipts) {
  if (!receipts.length) return {deployment:null, findings:[]};
  const identities = new Map();
  for (const row of receipts) identities.set(`${row.release}|${row.mainMergeSha}|${row.releaseBranchSha}|${row.parity}`,row);
  if (identities.size > 1) return {deployment:null, findings:[finding('E22_DEPLOYMENT_IDENTITY_CONFLICT',Array.from(identities.keys()).join(' <> '))]};
  return {deployment:Array.from(identities.values())[0], findings:[]};
}
function stageFromEvidence(comments, pr) {
  let state = 'REQUESTED';
  const bodies = (Array.isArray(comments) ? comments : []).map((row)=>String(row?.body || ''));
  if (bodies.some((body)=>body.includes('UD_E9_CANDIDATE_READY:') || body.includes('UD_CANDIDATE_READY'))) state = 'CANDIDATE_READY';
  if (bodies.some((body)=>body.includes('UD_VALIDATION_RESULT') && /^status:\s*GREEN$/m.test(body))) state = 'VALIDATED';
  if (pr?.merged === true) state = 'MERGED';
  return state;
}
function prMergeSha(pr) { return String(pr?.mergeCommitSha || pr?.merge_commit_sha || pr?.mergeSha || ''); }

function projectReleaseClosure(input = {}) {
  const findings = [];
  const request = isObject(input.request) ? input.request : {};
  const comments = Array.isArray(input.comments) ? input.comments : [];
  const pr = isObject(input.pr) ? input.pr : {};
  const releaseVersion = String(request.releaseVersion || '');
  const issueNumber = Number(request.issueNumber);
  const prNumber = Number(request.prNumber);
  const manifest = normalizeManifest(input.productionManifest);
  const spec = normalizeSpecIdentity(input.releaseSpecIdentity);
  const productionSha = String(input.productionSha || '');

  let executionState = stageFromEvidence(comments,pr);
  const depResult = uniqueDeployment(deploymentReceipts(comments,releaseVersion));
  findings.push(...depResult.findings);
  const deployment = depResult.deployment;

  if (deployment) {
    if (!versionOrder.parseReleaseVersion(releaseVersion) || deployment.release !== releaseVersion) findings.push(finding('E22_DEPLOYMENT_IDENTITY_CONFLICT','release-version'));
    if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) findings.push(finding('E22_DEPLOYMENT_EVIDENCE_INCOMPLETE','issue-number'));
    if (!Number.isSafeInteger(prNumber) || prNumber < 1 || Number(pr.number) !== prNumber) findings.push(finding('E22_DEPLOYMENT_IDENTITY_CONFLICT','pr-number'));
    if (pr.merged !== true) findings.push(finding('E22_DEPLOYMENT_EVIDENCE_INCOMPLETE','pr-not-merged'));
    if (!SHA_RE.test(prMergeSha(pr)) || prMergeSha(pr) !== deployment.mainMergeSha) findings.push(finding('E22_DEPLOYMENT_IDENTITY_CONFLICT','main-merge-sha'));
    if (!SHA_RE.test(productionSha)) findings.push(finding('E22_DEPLOYMENT_EVIDENCE_INCOMPLETE','production-sha'));
    else if (productionSha !== deployment.releaseBranchSha) findings.push(finding('E22_DEPLOYMENT_IDENTITY_CONFLICT','production-sha'));
    if (!manifest) findings.push(finding('E22_DEPLOYMENT_EVIDENCE_INCOMPLETE','production-manifest'));
    else {
      if (manifest.productVersion !== releaseVersion) findings.push(finding('E22_DEPLOYMENT_IDENTITY_CONFLICT','manifest-product'));
      if (!manifest.engineVersion || !manifest.managerVersion || !manifest.contracts) findings.push(finding('E22_DEPLOYMENT_EVIDENCE_INCOMPLETE','manifest-tuple'));
    }
    if (spec && manifest) {
      if (spec.productVersion !== manifest.productVersion || spec.engineVersion !== manifest.engineVersion || spec.managerVersion !== manifest.managerVersion || !sameContracts(spec.contracts,manifest.contracts)) {
        findings.push(finding('E22_DEPLOYMENT_IDENTITY_CONFLICT','spec-manifest-tuple'));
      }
    }
    if (!findings.some((row)=>row.code.startsWith('E22_DEPLOYMENT_'))) executionState = 'DEPLOYED';
  }

  const physical = [];
  for (const comment of comments) {
    const parsed = inspectPhysicalReceipt(comment);
    if (!parsed.present) continue;
    findings.push(...parsed.findings);
    if (!parsed.receipt) continue;
    const receipt = parsed.receipt;
    if (receipt.release !== releaseVersion) { findings.push(finding('E22_PHYSICAL_RELEASE_VERSION_MISMATCH',`${receipt.release}!=${releaseVersion}`)); continue; }
    if (executionState !== 'DEPLOYED' || !deployment) { findings.push(finding('E22_PHYSICAL_BEFORE_DEPLOYMENT',receipt.commentId)); continue; }
    if (receipt.releaseBranchSha !== deployment.releaseBranchSha) { findings.push(finding('E22_PHYSICAL_RELEASE_SHA_MISMATCH',receipt.commentId)); continue; }
    if (receipt.observedProduct !== 'UNKNOWN' && receipt.observedProduct !== releaseVersion) { findings.push(finding('E22_PHYSICAL_RELEASE_VERSION_MISMATCH',receipt.commentId)); continue; }
    if (manifest) {
      if (receipt.observedEngine !== 'UNKNOWN' && receipt.observedEngine !== manifest.engineVersion) { findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID',`engine-mismatch:${receipt.commentId}`)); continue; }
      if (receipt.observedManager !== 'UNKNOWN' && receipt.observedManager !== manifest.managerVersion) { findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID',`manager-mismatch:${receipt.commentId}`)); continue; }
    }
    if (receipt.verdict === 'ACCEPTED' && (receipt.observedProduct !== releaseVersion || receipt.health !== 'PASS' || receipt.feature !== 'PASS')) {
      findings.push(finding('E22_PHYSICAL_RECEIPT_SHAPE_INVALID',`accepted-gate:${receipt.commentId}`));
      continue;
    }
    physical.push(receipt);
  }

  const verdicts = new Set(physical.map((row)=>row.verdict));
  if (verdicts.size > 1) findings.push(finding('E22_PHYSICAL_VERDICT_CONFLICT',Array.from(verdicts).join('|')));
  const hasConflict = findings.some((row)=>row.code === 'E22_DEPLOYMENT_IDENTITY_CONFLICT' || row.code === 'E22_PHYSICAL_RELEASE_VERSION_MISMATCH' || row.code === 'E22_PHYSICAL_RELEASE_SHA_MISMATCH' || row.code === 'E22_PHYSICAL_VERDICT_CONFLICT' || row.code === 'E22_PHYSICAL_RECEIPT_SHAPE_INVALID' || row.code === 'E22_PHYSICAL_BEFORE_DEPLOYMENT');
  let physicalState = 'PENDING';
  let acceptedIdentity = null;
  if (!hasConflict && verdicts.size === 1) {
    const verdict = Array.from(verdicts)[0];
    if (verdict === 'ACCEPTED') {
      physicalState = 'ACCEPTED';
      const chosen = [...physical].sort((a,b)=>a.commentId-b.commentId)[0];
      acceptedIdentity = freeze({productVersion:releaseVersion,releaseSha:deployment.releaseBranchSha,issue:issueNumber,commentId:chosen.commentId,verdict:'ACCEPTED'});
    } else if (verdict === 'REJECTED') physicalState = 'REJECTED';
  }

  let compositeState;
  if (hasConflict) compositeState = 'CONFLICT';
  else if (executionState === 'DEPLOYED' && physicalState === 'ACCEPTED') compositeState = 'ACCEPTED';
  else if (executionState === 'DEPLOYED' && physicalState === 'REJECTED') compositeState = 'DEPLOYED_PHYSICAL_REJECTED';
  else if (executionState === 'DEPLOYED') compositeState = 'DEPLOYED_PENDING_PHYSICAL';
  else if (executionState === 'MERGED') compositeState = 'MERGED_PENDING_DEPLOY';
  else compositeState = executionState;

  const deployedIdentity = executionState === 'DEPLOYED' && deployment ? freeze({productVersion:releaseVersion,releaseSha:deployment.releaseBranchSha,issue:issueNumber,prNumber,mainMergeSha:deployment.mainMergeSha}) : null;
  return freeze({
    execution:{state:executionState},
    physical:{state:physicalState},
    composite:{state:compositeState},
    deployedIdentity,
    acceptedIdentity,
    findings,
  });
}

function resolveLatestAccepted(projections) {
  const rows = Array.isArray(projections) ? projections : [];
  const findings = [];
  const accepted = [];
  const deployed = [];
  for (const projection of rows) {
    if (projection?.deployedIdentity) deployed.push(projection.deployedIdentity);
    if (projection?.composite?.state === 'ACCEPTED' && projection?.acceptedIdentity) accepted.push(projection.acceptedIdentity);
  }
  const conflicting = new Map();
  for (const row of accepted) {
    const current = conflicting.get(row.productVersion);
    if (current && current.releaseSha !== row.releaseSha) findings.push(finding('E22_ACCEPTED_BASELINE_AMBIGUOUS',row.productVersion));
    else conflicting.set(row.productVersion,row);
  }
  const sort = (a,b) => versionOrder.compareReleaseVersions(a.productVersion,b.productVersion) ?? 0;
  accepted.sort(sort);
  deployed.sort(sort);
  const latestAcceptedIdentity = findings.some((row)=>row.code === 'E22_ACCEPTED_BASELINE_AMBIGUOUS') ? null : (accepted.at(-1) || null);
  return freeze({latestAcceptedIdentity, latestDeployedIdentity:deployed.at(-1) || null, findings});
}

module.exports = {
  SHA_RE,PHYSICAL_MARKER,DEPLOY_MARKER,
  inspectPhysicalReceipt,renderPhysicalAcceptanceReceipt,
  normalizeManifest,projectReleaseClosure,resolveLatestAccepted,
};
