'use strict';

const requiredCi = require('../observers/required-ci.cjs');
const productionAuthority = require('../observers/production-authority.cjs');
const writerWorkflows = require('../observers/writer-workflows.cjs');
const bootstrap = require('../observers/bootstrap.cjs');
const protection = require('../observers/protection.cjs');
const projectStatus = require('../observers/project-status.cjs');
const mainDelta = require('../observers/main-delta.cjs');
const deliveryReceipts = require('../observers/delivery-receipts.cjs');

function descriptor(id, observe, permissionClass, phase, capabilities) {
  return Object.freeze({id, observe, permissionClass, phase, capabilities: Object.freeze([...capabilities])});
}
const modules = Object.freeze([
  descriptor('requiredCi', requiredCi.observe, 'actions:read', 'base', ['events', 'requiredCoverage']),
  descriptor('productionAuthority', productionAuthority.observe, 'contents:read', 'base', ['events', 'requiredCoverage']),
  descriptor('writers', writerWorkflows.observe, 'actions:read', 'base', ['events', 'requiredCoverage']),
  descriptor('bootstrap', bootstrap.observe, 'contents:read', 'base', ['events', 'requiredCoverage']),
  descriptor('protection', protection.observe, 'contents:read', 'base', ['protectionSurface']),
  descriptor('projectStatus', projectStatus.observe, 'issues:read', 'base', ['projectSurface']),
  descriptor('mainDelta', mainDelta.observe, 'issues:read+contents:read', 'base', ['operatorCapsuleChange']),
  descriptor('delivery', deliveryReceipts.observe, 'issues:read', 'post-incidents', ['deliverySurface']),
]);
function modulesForPhase(phase = 'base') { return modules.filter((module) => module.phase === phase); }
function modulesWithCapability(capability) { return modules.filter((module) => module.capabilities.includes(capability)); }
function moduleWithCapability(capability) {
  const matches = modulesWithCapability(capability);
  if (matches.length !== 1) throw new Error(`module capability cardinality ${capability}: ${matches.length}`);
  return matches[0];
}

module.exports = {modules, modulesForPhase, modulesWithCapability, moduleWithCapability};
