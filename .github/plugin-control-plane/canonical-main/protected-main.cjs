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

  return errors;
}

function observeProtection(branch, {root, policy, contract = loadProtectedMainContract()} = {}) {
  const writerErrors = root && policy ? writerContractErrors(root, policy, contract) : [];
  const names = requiredCheckNames(branch);
  const requiredName = contract.requiredCheck?.displayName || 'UNKNOWN';
  const protectedFlag = branch?.protected === true;
  const enforcementLevel = branch?.protection?.required_status_checks?.enforcement_level || 'off';
  const requiredPresent = names.includes(requiredName);
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
    requiredName,
    requiredPresent,
    requiredChecks: names,
    writerGatewayReady: writerErrors.length === 0,
    writerErrors,
    shadowProof: contract.shadowProof?.result || 'UNKNOWN',
    activeWriterCount: (contract.activeWriters || []).length,
  };
}

module.exports = {
  loadProtectedMainContract,
  requiredCheckNames,
  directWriterInventory,
  writerContractErrors,
  observeProtection,
};
