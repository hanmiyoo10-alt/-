import fs from 'node:fs';
import { assert, equal } from '../../tooling/assertions.mjs';
import { resolveApproval } from '../../tooling/release-approval-resolve.mjs';
import { buildApprovalPackage } from '../../tooling/release-approval-package.mjs';
import { validateApprovalEnvelope } from '../../tooling/release-approval-envelope.mjs';

function expectCode(fn,code){let got=null;try{fn();}catch(e){got=e?.code||null;}equal(got,code,`expected ${code}`);}
function makeCase(mode='NEW_VERSION'){
  const suffix={NEW_VERSION:'new',SAME_VERSION_CORRECTION:'correction',ROLLBACK:'rollback'}[mode];
  const releaseId=`simcore-v0.64.8-${suffix}-01`;
  const intentId='simcore-v0.64.8-intent-01';
  const receiptPath=`products/simcore/releases/candidate-receipts/${intentId}.json`;
  const approvalPath=`products/simcore/releases/approvals/${releaseId}.json`;
  const specPath=`products/simcore/releases/specs/${releaseId}.json`;
  const approval={schemaVersion:1,releaseId,candidateReceiptPath:receiptPath,authorityConfirmation:'RS2_4_RELEASE'};
  const receipt={schemaVersion:1,product:'SimCore',intentId,releaseId,candidateDisposition:'CREATED',expectedProductionCommit:'a'.repeat(40),sourceCommit:'b'.repeat(40),candidateCommit:'c'.repeat(40),candidateReleaseBlob:'d'.repeat(40),candidateFetchRef:`candidate/simcore/${intentId}`,builderPath:'products/simcore/tooling/build-fixture.py',builderSha256:'e'.repeat(64),verifierCommit:'f'.repeat(40),verificationSuite:'batch-a',verificationReportSha256:'1'.repeat(64),result:'PASS',productionMutation:'NONE',releaseAuthority:'CANDIDATE_RECEIPT_ONLY'};
  const spec={schemaVersion:1,releaseId,product:'SimCore',version:'0.64.8',releaseName:'Fixture Release',releaseMode:mode,candidateCommit:receipt.candidateCommit,expectedProductionCommit:receipt.expectedProductionCommit,candidateReleaseBlob:receipt.candidateReleaseBlob,primaryGoalId:'R2_1_E_FIXTURE',changeClass:mode==='ROLLBACK'?'ROLLBACK':'RUNTIME_FEATURE',evidenceRefs:['docs/fixture.md'],liveGate:{required:true,scenarioId:'R2_1_E_FIXTURE_REAL_LONG_CHAT',closeAuthority:'HUMAN_EVIDENCE'}};
  if(mode==='ROLLBACK')spec.rollback={approvedSafeCommit:'2'.repeat(40),approvedSafeBlob:'3'.repeat(40),reasonCode:'FIXTURE_ROLLBACK'};
  const shadow={schemaVersion:1,product:'SimCore',authority:'SHADOW_ONLY',intentId,releaseId,candidateReceiptPath:receiptPath,derivedSpec:spec};
  return {approval,approvalPath,receipt,receiptPath,shadow,shadowPath:`products/simcore/releases/spec-shadows/${releaseId}.json`,spec,specPath};
}
function resolve(c,overrides={}){return resolveApproval({approval:c.approval,approvalPath:c.approvalPath,candidateReceipt:c.receipt,candidateReceiptPath:c.receiptPath,specShadow:c.shadow,specShadowPath:c.shadowPath,observedCandidateCommit:c.receipt.candidateCommit,observedProductionCommit:c.receipt.expectedProductionCommit,...overrides});}
function envelope(c,overrides={}){return validateApprovalEnvelope({mode:'PREMERGE',approval:c.approval,approvalPath:c.approvalPath,authorizedSpec:c.spec,specPath:c.specPath,candidateReceipt:c.receipt,candidateReceiptPath:c.receiptPath,specShadow:c.shadow,specShadowPath:c.shadowPath,observedCandidateCommit:c.receipt.candidateCommit,observedProductionCommit:c.receipt.expectedProductionCommit,changedPaths:[c.approvalPath,c.specPath],...overrides});}

export async function runSuite({fixtures}){
  const assertions=[];const pass=(id)=>assertions.push({id,status:'PASS'});
  equal(fixtures[0].expected.publicationDispatch,'DISABLED_PENDING_OPERATOR_DECISION','fixture resolver boundary');
  for(const mode of ['NEW_VERSION','SAME_VERSION_CORRECTION','ROLLBACK']){
    const c=makeCase(mode);const r=resolve(c);
    equal(r.result,'PASS',`${mode} result`);
    equal(r.decision,'APPROVAL_RESOLVED_SHADOW',`${mode} decision`);
    equal(r.releaseAuthority,'APPROVAL_RESOLUTION_ONLY',`${mode} authority`);
    equal(r.productionMutation,'NONE',`${mode} production mutation`);
    equal(r.publicationDispatch,'DISABLED_PENDING_OPERATOR_DECISION',`${mode} resolver dispatch boundary`);
    equal(r.candidateCommit,c.receipt.candidateCommit,`${mode} candidate`);
    if(mode==='ROLLBACK')equal(r.resolvedSpec.rollback.reasonCode,'FIXTURE_ROLLBACK','rollback metadata preserved');
    const pkg=buildApprovalPackage({candidateReceipt:c.receipt,candidateReceiptPath:c.receiptPath,specShadow:c.shadow,specShadowPath:c.shadowPath});
    equal(pkg.approvalPath,c.approvalPath,`${mode} package approval path`);
    equal(pkg.specPath,c.specPath,`${mode} package spec path`);
    equal(pkg.canonicalTitle,`SimCore exact release approval: ${c.approval.releaseId}`,`${mode} canonical title`);
    equal(JSON.stringify(pkg.approval),JSON.stringify(c.approval),`${mode} package approval`);
    equal(JSON.stringify(pkg.spec),JSON.stringify(c.spec),`${mode} package machine spec`);
    equal(pkg.productionMutation,'NONE',`${mode} package production mutation`);
    equal(pkg.publicationDispatch,'NONE_PACKAGE_ONLY',`${mode} package dispatch`);
    const env=envelope(c,{observedTitle:'totally noncanonical title'});
    equal(env.result,'PASS',`${mode} envelope pass`);
    equal(env.releaseAuthority,'APPROVAL_ENVELOPE_VALIDATION_ONLY',`${mode} envelope authority`);
    equal(env.titleCanonical,false,`${mode} noncanonical title must be presentation only`);
    pass(`E-${mode}-exact-resolution-package-envelope`);
  }

  const embedded=makeCase();embedded.approval={...embedded.approval,candidateCommit:'9'.repeat(40)};
  expectCode(()=>resolve(embedded),'APPROVAL_SCHEMA_INVALID');pass('E-N1-human-cannot-embed-candidate');
  const wrongReceipt=makeCase();wrongReceipt.receipt.releaseId='simcore-v0.64.9-new-01';
  expectCode(()=>resolve(wrongReceipt),'APPROVAL_RECEIPT_RELEASE_MISMATCH');pass('E-N2-receipt-release-mismatch');
  const wrongPath=makeCase();wrongPath.receiptPath='products/simcore/releases/candidate-receipts/other.json';
  expectCode(()=>resolve(wrongPath),'APPROVAL_RECEIPT_PATH_MISMATCH');pass('E-N3-receipt-path-mismatch');
  const wrongCandidate=makeCase();
  expectCode(()=>resolve(wrongCandidate,{observedCandidateCommit:'9'.repeat(40)}),'APPROVAL_CANDIDATE_REF_MOVED');pass('E-N4-candidate-ref-moved');
  const wrongProduction=makeCase();
  expectCode(()=>resolve(wrongProduction,{observedProductionCommit:'9'.repeat(40)}),'APPROVAL_PRODUCTION_PARENT_MOVED');pass('E-N5-production-parent-moved');
  const wrongSpec=makeCase();wrongSpec.shadow.derivedSpec.candidateCommit='9'.repeat(40);
  expectCode(()=>resolve(wrongSpec),'APPROVAL_SPEC_CANDIDATE_MISMATCH');pass('E-N6-spec-candidate-mismatch');
  const noRollback=makeCase('ROLLBACK');delete noRollback.shadow.derivedSpec.rollback;
  expectCode(()=>resolve(noRollback),'APPROVAL_SPEC_SCHEMA_INVALID');pass('E-N7-rollback-metadata-required');
  const wrongAuthority=makeCase();wrongAuthority.approval.authorityConfirmation='NOPE';
  expectCode(()=>resolve(wrongAuthority),'APPROVAL_AUTHORITY_INVALID');pass('E-N8-authority-marker');
  const extraSpec=makeCase();extraSpec.shadow.derivedSpec.manualCandidateOverride='9'.repeat(40);
  expectCode(()=>resolve(extraSpec),'APPROVAL_SPEC_SCHEMA_INVALID');pass('E-N9-machine-spec-extra-field-block');
  const wrongApprovalPath=makeCase();
  expectCode(()=>resolve(wrongApprovalPath,{approvalPath:'products/simcore/releases/approvals/other.json'}),'APPROVAL_PATH_MISMATCH');pass('E-N10-approval-path-bound');
  const wrongPackageShadow=makeCase();
  expectCode(()=>buildApprovalPackage({candidateReceipt:wrongPackageShadow.receipt,candidateReceiptPath:wrongPackageShadow.receiptPath,specShadow:wrongPackageShadow.shadow,specShadowPath:'products/simcore/releases/spec-shadows/other.json'}),'APPROVAL_PACKAGE_SHADOW_PATH_MISMATCH');pass('E-N11-package-shadow-path-bound');

  const resolver=fs.readFileSync('products/simcore/tooling/release-approval-resolve.mjs','utf8');
  const packager=fs.readFileSync('products/simcore/tooling/release-approval-package.mjs','utf8');
  const envelopeTool=fs.readFileSync('products/simcore/tooling/release-approval-envelope.mjs','utf8');
  for(const tool of [resolver,packager,envelopeTool])for(const token of ['release-publish.mjs','repo-main-write.py','gh workflow run','git push','force-with-lease'])assert(!tool.includes(token),`approval tooling gained publication primitive: ${token}`);
  assert(resolver.includes('DISABLED_PENDING_OPERATOR_DECISION'),'resolver operator boundary missing');
  assert(!packager.includes("for(const k of ['candidate-receipt','spec-shadow','approval-out','spec-out'])"),'legacy manual output requirement remains');
  assert(packager.includes('APPROVAL_PACKAGE_MANUAL_OUTPUT_PATH_FORBIDDEN'),'manual output path must fail closed');
  assert(packager.includes('canonicalTitle'),'canonical title guidance missing');
  assert(envelopeTool.includes('APPROVAL_ENVELOPE_VALIDATION_ONLY'),'shared envelope authority marker missing');
  pass('E-N12-approval-tooling-no-publication-authority');

  const workflow=fs.readFileSync('.github/workflows/simcore-release-pr-activation.yml','utf8');
  for(const token of [
    "products/simcore/releases/approvals/**",
    'test "${#CHANGED[@]}" -eq 2',
    'products/simcore/tooling/release-approval-envelope.mjs',
    'SIMCORE_EXACT_APPROVAL_BOUNDARY_PASS',
    'gh workflow run simcore-release-permanent.yml',
    'gh run watch',
    'Approval Activation Required',
  ]) assert(workflow.includes(token),`delegated approval adapter token missing: ${token}`);
  assert(!/^\s*-\s*['"]?products\/simcore\/releases\/activations\//m.test(workflow),'legacy activation path remains active');
  for(const token of ['contents: write','release-publish.mjs','repo-main-write.py','git push --force','force-with-lease','+refs/heads/release-simcore','PR_TITLE','SIMCORE_RELEASE_APPROVAL_TITLE_INVALID','release-approval-resolve.mjs'])assert(!workflow.includes(token),`delegated approval adapter retained forbidden/duplicated semantic: ${token}`);
  pass('E-N13-delegated-adapter-boundary');

  return {coverage:'EXECUTABLE',status:'PASS',assertions};
}
