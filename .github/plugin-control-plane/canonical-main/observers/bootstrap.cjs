'use strict';

const fs = require('fs');
const path = require('path');
const {validateDescriptor} = require('../contract.cjs');
const {repositoryBindingErrors} = require('../bootstrap.cjs');
const {makeEvent, stableEventId} = require('./common.cjs');

function descriptorFiles(root, policy) {
  const dir = path.join(root, policy.adapters.bootstrap.descriptorDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort().map((name) => path.join(dir, name));
}
function bootstrapEvent(file, descriptor, errors, recovered, root = process.cwd()) {
  const id = descriptor?.id || path.basename(file, '.json');
  return makeEvent({eventClass: 'PROJECT_BOOTSTRAP', subject: {kind: descriptor?.kind || 'project', id}, scope: descriptor?.kind === 'product' ? [`product:${id}`] : [`plugin:${id}`], authority: {kind: 'bootstrap-descriptor', locator: path.relative(root, file)}, from: recovered ? 'INVALID' : 'VALID', to: recovered ? 'VALID' : 'INVALID', reasonCode: 'PROJECT_BOOTSTRAP_VALIDATION_FAILED', disposition: recovered ? 'RECOVERY_FEEDBACK_CANDIDATE' : 'FEEDBACK_CANDIDATE', evidence: errors.length ? errors.map((error) => `error:${error}`) : [`descriptor:${path.relative(root, file)}`], eventId: stableEventId('bootstrap', id, errors.join('|') || 'valid'), summary: recovered ? `${id} bootstrap descriptor is valid.` : `${id} bootstrap descriptor failed validation.`});
}
async function observe(context) {
  const files = descriptorFiles(context.root, context.policy);
  if (!files.length) return {known: false, summary: 'UNKNOWN — no registered bootstrap descriptors', statuses: [], events: [], data: {records: []}};
  const statuses = [], events = [], records = [];
  for (const file of files) {
    let descriptor, errors = [];
    try { descriptor = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { errors = [`invalid JSON: ${error.message}`]; }
    if (descriptor) errors.push(...validateDescriptor(descriptor, context.policy), ...repositoryBindingErrors(descriptor, context.root));
    const status = {id: descriptor?.id || path.basename(file, '.json'), kind: descriptor?.kind || 'unknown', profile: descriptor?.memory?.profile || 'UNKNOWN', ready: errors.length === 0, errors};
    statuses.push(status); records.push({file, descriptor, status}); events.push(bootstrapEvent(file, descriptor, errors, errors.length === 0, context.root));
  }
  return {known: true, summary: statuses.every((row) => row.ready) ? 'READY' : 'INCOMPLETE', statuses, events, data: {records}};
}

module.exports = {descriptorFiles, bootstrapEvent, observe};
