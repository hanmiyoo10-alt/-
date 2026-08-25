'use strict';

const fs = require('fs');
const path = require('path');
const {loadPolicy, validateDescriptor} = require('./contract.cjs');
const {repositoryBindingErrors} = require('./bootstrap.cjs');
const bootstrapObserver = require('./observers/bootstrap.cjs');
const {expectedScopes, deriveCoverage} = require('./domains/bootstrap.cjs');
const surface = require('./surfaces/bootstrap.cjs');
const {refresh} = require('./orchestrator/refresh.cjs');

function readRegistry(root = process.cwd()) {
  return JSON.parse(fs.readFileSync(path.join(root, '.github/plugin-control-plane/registry.json'), 'utf8'));
}

function descriptorCoverage(root = process.cwd()) {
  const policy = loadPolicy();
  const files = bootstrapObserver.descriptorFiles(root, policy);
  const statuses = files.map((file) => {
    let descriptor;
    let errors = [];
    try { descriptor = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { errors = [`invalid JSON: ${error.message}`]; }
    if (descriptor) errors.push(...validateDescriptor(descriptor, policy), ...repositoryBindingErrors(descriptor, root));
    return {id: descriptor?.id || path.basename(file, '.json'), kind: descriptor?.kind || 'unknown', profile: descriptor?.memory?.profile || 'UNKNOWN', ready: errors.length === 0, errors};
  });
  return deriveCoverage(readRegistry(root), {statuses});
}

async function main() {
  if (process.argv[2] !== 'refresh') throw new Error('usage: bootstrap-surface.cjs refresh');
  await refresh();
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});

module.exports = {
  ...surface,
  expectedScopes: (root = process.cwd()) => expectedScopes(readRegistry(root)),
  descriptorCoverage,
  refresh,
};
