'use strict';

const {makeEvent, stableEventId} = require('./common.cjs');

async function observe(context) {
  const config = context.policy.adapters.productionAuthority.simcore;
  const raw = await context.repoFiles.fetchContent(config.manifest, 'main');
  if (!raw) return {known: false, summary: 'UNKNOWN — SimCore manifest missing', events: [], data: null};
  let manifest;
  try { manifest = JSON.parse(raw); } catch (_) { return {known: false, summary: 'UNKNOWN — SimCore manifest invalid', events: [], data: null}; }
  const branch = manifest.release_branch;
  const recorded = manifest.release_commit;
  if (!branch || !recorded) return {known: false, summary: 'UNKNOWN — SimCore release identity incomplete', events: [], data: {manifest}};
  const actual = await context.repoFiles.branchHead(branch);
  if (!actual) return {known: false, summary: `UNKNOWN — release branch ${branch} missing`, events: [], data: {manifest}};
  const match = actual === recorded;
  const event = makeEvent({eventClass: 'PRODUCTION_AUTHORITY', subject: {kind: 'project', id: 'simcore'}, scope: ['plugin:simcore'], authority: {kind: 'release-branch', locator: branch}, from: match ? 'MISMATCH' : 'MATCH', to: match ? 'MATCH' : 'MISMATCH', reasonCode: 'RELEASE_AUTHORITY_IDENTITY_MISMATCH', disposition: match ? 'RECOVERY_FEEDBACK_CANDIDATE' : 'ESCALATION_CANDIDATE', evidence: [`recorded:${recorded}`, `actual:${actual}`], eventId: stableEventId('simcore-release-identity', recorded, actual), summary: match ? 'SimCore release identity matches the manifest.' : 'SimCore release branch head does not match the manifest release commit.'});
  return {known: true, matching: match, summary: `${match ? 'MATCH' : 'MISMATCH'} — ${branch} ${actual}`, events: [event], data: {manifest, branch, recorded, actual}};
}

module.exports = {observe};
