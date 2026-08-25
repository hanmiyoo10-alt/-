'use strict';

const fs = require('fs');
const path = require('path');

const CONTRACT_PATH = path.join(__dirname, 'protected-main.json');

function loadProtectedMainContract() {
  return JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
}

function requiredCheckNames(branch) {
  const status = branch?.protection?.required_status_checks || {};
  const contexts = Array.isArray(status.contexts) ? status.contexts : [];
  const checks = Array.isArray(status.checks)
    ? status.checks.map((row) => row?.context || row?.name).filter(Boolean)
    : [];
  return [...new Set([...contexts, ...checks])].sort();
}

function workflowText(root, name) {
  const file = path.join(root, '.github', 'workflows', name);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function directWriterInventory(root) {
  const dir = path.join(root, '.github', 'workflows');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => /\.ya?ml$/.test(name))
    .filter((name) => fs.readFileSync(path.join(dir, name), 'utf8').includes('scripts/repo-main-write.py'))
    .sort();
}

function softEnforcementContractErrors(root, contract = loadProtectedMainContract()) {
  const errors = [];
  const soft = contract.softEnforcement || {};
  if (soft.enabled !== true) return errors;

  const workflowName = soft.workflow;
  const scriptPath = soft.script;
  const workflow = workflowName ? workflowText(root, workflowName) : null;
  const scriptFile = scriptPath ? path.join(root, scriptPath) : null;
  const script = scriptFile && fs.existsSync(scriptFile) ? fs.readFileSync(scriptFile, 'utf8') : null;

  if (!workflow) errors.push('PROTECTED_MAIN_SOFT_GUARD_WORKFLOW_MISSING');
  if (!script) errors.push('PROTECTED_MAIN_SOFT_GUARD_SCRIPT_MISSING');
  if (!workflow || !script) return errors;

  if (!workflow.includes(scriptPath)) errors.push('PROTECTED_MAIN_SOFT_GUARD_DELEGATION_MISSING');
  if (!/actions:\s*write/.test(workflow)) errors.push('PROTECTED_MAIN_SOFT_GUARD_ACTIONS_WRITE_MISSING');
  if (!/contents:\s*write/.test(workflow)) errors.push('PROTECTED_MAIN_SOFT_GUARD_CONTENTS_WRITE_MISSING');
  if (!/workflow_run:/.test(workflow) || !/SimCore CI/.test(workflow)) errors.push('PROTECTED_MAIN_SOFT_GUARD_TRIGGER_MISSING');
  if (!/github\.event\.workflow_run\.event == 'push'/.test(workflow)) errors.push('PROTECTED_MAIN_SOFT_GUARD_PUSH_SCOPE_MISSING');
  if (!/github\.event\.workflow_run\.head_branch == 'main'/.test(workflow)) errors.push('PROTECTED_MAIN_SOFT_GUARD_MAIN_SCOPE_MISSING');

  for (const token of [
    'scripts/repo-main-write.py',
    '--attempts 1',
    '--required-workflow simcore-ci.yml',
    '--required-profile MAIN_HEALTH',
    '--required-job Required',
    '--verify-gate-only',
    'SOFT_GUARD_VERIFIED_PARENT_MISMATCH',
    'SOFT_GUARD_BASE_MOVED_AFTER_GATE',
  ]) {
    if (!script.includes(token)) errors.push(`PROTECTED_MAIN_SOFT_GUARD_CONTRACT_MISSING:${token}`);
  }
  if (/--force(?:\s|$)|force-with-lease/.test(script)) errors.push('PROTECTED_MAIN_SOFT_GUARD_FORCE_FORBIDDEN');
  if (soft.writerClassification !== 'recovery-delegated') errors.push('PROTECTED_MAIN_SOFT_GUARD_CLASSIFICATION_INVALID');
  if (soft.verifyGateOnlyBeforeLanding !== true || soft.finalMainIdentityBarrier !== true) errors.push('PROTECTED_MAIN_SOFT_GUARD_IDENTITY_BARRIER_INVALID');
  if (soft.nativeProtectionEquivalent !== false) errors.push('PROTECTED_MAIN_SOFT_GUARD_NATIVE_EQUIVALENCE_INVALID');

  return errors;
}

function writerContractErrors(root, policy, contract = loadProtectedMainContract()) {
  const errors = [];
  const inventory = new Map((policy.adapters?.writerInventory || []).map((row) => [row.workflow, row.mode]));
  const activeInventory = [...inventory.entries()].filter(([, mode]) => mode === 'active').map(([name]) => name).sort();
  const declaredActive = [...(contract.activeWriters || [])].sort();
  const directWriters = directWriterInventory(root);

  if (JSON.stringify(activeInventory) !== JSON.stringify(declaredActive)) {
    errors.push(`PROTECTED_MAIN_ACTIVE_WRITER_SET_MISMATCH:${activeInventory.join(',')}!=${declaredActive.join(',')}`);
  }

  for (const name of directWriters) {
    if (!inventory.has(name)) errors.push(`PROTECTED_MAIN_WRITER_UNCLASSIFIED:${name}`);
  }

  for (const name of inventory.keys()) {
    if (!directWriters.includes(name)) errors.push(`PROTECTED_MAIN_INVENTORY_WRITER_PATH_MISSING:${name}`);
  }

  for (const name of declaredActive) {
    const text = workflowText(root, name);
    if (text === null) {
      errors.push(`PROTECTED_MAIN_ACTIVE_WRITER_MISSING:${name}`);
      continue;
    }
    if (!text.includes('scripts/repo-main-write.py')) errors.push(`PROTECTED_MAIN_GATEWAY_MISSING:${name}`);
    if (!/actions:\s*write/.test(text)) errors.push(`PROTECTED_MAIN_ACTIONS_WRITE_MISSING:${name}`);
    if (!/--required-workflow\s+simcore-ci\.yml/.test(text)) errors.push(`PROTECTED_MAIN_REQUIRED_WORKFLOW_MISSING:${name}`);
    if (!/--required-profile\s+MAIN_HEALTH/.test(text)) errors.push(`PROTECTED_MAIN_REQUIRED_PROFILE_MISSING:${name}`);
    if (!/--required-job\s+Required/.test(text)) errors.push(`PROTECTED_MAIN_REQUIRED_JOB_MISSING:${name}`);
    if (/--force(?:\s|$)|force-with-lease/.test(text)) errors.push(`PROTECTED_MAIN_FORCE_PATH_FORBIDDEN:${name}`);
  }

  const helperPath = path.join(root, contract.gateway?.helper || 'scripts/repo-main-write.py');
  if (!fs.existsSync(helperPath)) {
    errors.push('PROTECTED_MAIN_HELPER_MISSING');
  } else {
    const helper = fs.readFileSync(helperPath, 'utf8');
    for (const token of [
      '--required-workflow',
      '--required-profile',
      '--required-job',
      '--verify-gate-only',
      'MAIN_WRITE_REQUIRED_GATE_PASS',
      'MAIN_WRITE_BASE_MOVED_AFTER_GATE',
    ]) {
      if (!helper.includes(token)) errors.push(`PROTECTED_MAIN_HELPER_CONTRACT_MISSING:${token}`);
    }
    if (helper.includes('force-with-lease') || helper.includes('"--force"') || helper.includes("'--force'")) {
      errors.push('PROTECTED_MAIN_HELPER_FORCE_FORBIDDEN');
    }
  }

  if (contract.shadowProof?.result !== 'PASS' || contract.shadowProof?.mainMutation !== 'NONE' || contract.shadowProof?.stagingRefCleaned !== true) {
    errors.push('PROTECTED_MAIN_SHADOW_PROOF_INVALID');
  }

  errors.push(...softEnforcementContractErrors(root, contract));
  return errors;
}

function observeProtection(branch, {root, policy, contract = loadProtectedMainContract()} = {}) {
  const writerErrors = root && policy ? writerContractErrors(root, policy, contract) : [];
  const names = requiredCheckNames(branch);
  const requiredDisplayName = contract.requiredCheck?.displayName || 'UNKNOWN';
  const requiredApiContext = contract.requiredCheck?.apiContext || requiredDisplayName;
  const protectedFlag = branch?.protected === true;
  const enforcementLevel = branch?.protection?.required_status_checks?.enforcement_level || 'off';
  const requiredPresent = names.includes(requiredApiContext) || names.includes(requiredDisplayName);
  const readiness = writerErrors.length === 0 && contract.declaredReadiness === 'READY_TO_ACTIVATE';

  let state;
  if (!protectedFlag) {
    state = contract.enforcementExpected === true ? 'DRIFT' : readiness ? 'READY_TO_ACTIVATE' : 'OFF';
  } else if (enforcementLevel === 'off' || !requiredPresent || writerErrors.length > 0) {
    state = 'DRIFT';
  } else {
    state = 'ENFORCED';
  }

  return {
    state,
    protected: protectedFlag,
    enforcementLevel,
    requiredName: requiredDisplayName,
    requiredApiContext,
    requiredPresent,
    requiredChecks: names,
    writerGatewayReady: writerErrors.length === 0,
    writerErrors,
    shadowProof: contract.shadowProof?.result || 'UNKNOWN',
    activeWriterCount: (contract.activeWriters || []).length,
    automaticActivationAttempt: contract.activation?.automaticAttempt === true,
    softEnforcementEnabled: contract.softEnforcement?.enabled === true,
    softEnforcementStrategy: contract.softEnforcement?.strategy || 'NONE',
    nativeProtectionEquivalent: contract.softEnforcement?.nativeProtectionEquivalent === true,
  };
}

module.exports = {
  loadProtectedMainContract,
  requiredCheckNames,
  workflowText,
  directWriterInventory,
  softEnforcementContractErrors,
  writerContractErrors,
  observeProtection,
};
