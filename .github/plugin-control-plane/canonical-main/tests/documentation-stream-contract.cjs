const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EVENT_CLASSES, GENERATED_MARKER, changedPathsFromPush, normalizeEvent, incidentEventFromIssue, markerForEvent, parseEventMarker, renderLiveComment } = require('../documentation-stream/event.cjs');
const { renderDecisionLog, renderChangeLog, renderProjectCatalog, renderArchitectureSnapshot, eventsFromComments } = require('../documentation-stream/render.cjs');

const root = path.resolve(__dirname, '../../../..');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../documentation-stream/config.json'), 'utf8'));
const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '../policy.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(root, '.github/plugin-control-plane/registry.json'), 'utf8'));

assert.deepEqual(config.eventClasses, EVENT_CLASSES);
assert.equal(config.liveIssueNumber, 440);
assert.equal(config.promotion.directMainWrites, false);
assert.ok(config.promotion.ignoreCommitMessageMarkers.includes(GENERATED_MARKER));

const push = normalizeEvent({ eventName: 'push', repository: 'hanmiyoo10-alt/-', payload: { ref: 'refs/heads/main', after: 'a'.repeat(40), head_commit: { id: 'a'.repeat(40), message: 'infra: change canonical main', timestamp: '2026-08-26T00:00:00Z' }, commits: [{ modified: ['.github/plugin-control-plane/canonical-main/policy.json'], added: [], removed: [] }] } });
assert.equal(push.eventClass, 'CHANGE'); assert.equal(push.stable, true); assert.equal(push.eventId.length, 64);
const headOnlyPayload = { ref: 'refs/heads/main', after: 'd'.repeat(40), head_commit: { id: 'd'.repeat(40), message: 'infra: head only change', timestamp: '2026-08-26T00:00:00Z', added: [], modified: ['.github/workflows/canonical-main-docs.yml'], removed: [] }, commits: [] };
assert.deepEqual(changedPathsFromPush(headOnlyPayload), ['.github/workflows/canonical-main-docs.yml']);
assert.equal(normalizeEvent({ eventName: 'push', repository: 'hanmiyoo10-alt/-', payload: headOnlyPayload }).eventClass, 'CHANGE');
const projectPush = normalizeEvent({ eventName: 'push', repository: 'hanmiyoo10-alt/-', payload: { ref: 'refs/heads/main', after: 'c'.repeat(40), head_commit: { id: 'c'.repeat(40), message: 'docs: update project registry', timestamp: '2026-08-26T00:00:00Z' }, commits: [{ modified: ['.github/plugin-control-plane/registry.json'], added: [], removed: [] }] } });
assert.equal(projectPush.eventClass, 'PROJECT');
assert.equal(normalizeEvent({ eventName: 'push', repository: 'hanmiyoo10-alt/-', payload: { ref: 'refs/heads/main', after: 'b'.repeat(40), head_commit: { id: 'b'.repeat(40), message: `docs: generated ${GENERATED_MARKER}`, timestamp: '2026-08-26T00:00:00Z' }, commits: [{ modified: ['docs/REPO_CHANGELOG.md'], added: [], removed: [] }] } }), null);

const openIssue = { number: 999, title: '[repo-incident:P1] TEST', state: 'open', labels: [{ name: 'control-plane:incident' }, { name: 'incident:open' }], body: '<!-- canonical-main-event:b3Blbi0x -->', updated_at: '2026-08-26T00:01:00Z', html_url: 'https://example/999' };
const recoveredIssue = { ...openIssue, state: 'closed', labels: [{ name: 'control-plane:incident' }, { name: 'incident:recovered' }], body: '<!-- canonical-main-event:cmVjb3ZlcmVkLTE -->', updated_at: '2026-08-26T00:02:00Z' };
const incident = incidentEventFromIssue(openIssue);
const recovery = incidentEventFromIssue(recoveredIssue);
assert.equal(incident.eventClass, 'INCIDENT'); assert.equal(recovery.eventClass, 'RECOVERY'); assert.notEqual(incident.eventId, recovery.eventId);
assert.equal(normalizeEvent({ eventName: 'issues', repository: 'hanmiyoo10-alt/-', payload: { action: 'opened', issue: openIssue } }).eventId, incident.eventId);

const decision = normalizeEvent({ eventName: 'issues', repository: 'hanmiyoo10-alt/-', payload: { action: 'closed', issue: { number: 439, title: '[design] canonical-main docs', labels: [], closed_at: '2026-08-26T00:03:00Z', html_url: 'https://example/439' } } });
assert.equal(decision.eventClass, 'DECISION');
assert.deepEqual(parseEventMarker(markerForEvent(push)), push);
assert.ok(renderLiveComment(push).includes(push.eventId));
const events = eventsFromComments([{ body: renderLiveComment(push) }, { body: renderLiveComment(push) }, { body: renderLiveComment(decision) }]);
assert.equal(events.length, 2); assert.ok(renderDecisionLog(events).includes(decision.eventId)); assert.ok(!renderDecisionLog(events).includes(push.eventId)); assert.ok(renderChangeLog(events).includes(push.eventId));
assert.ok(renderProjectCatalog({ registry, root }).includes('plugin:simcore'));
const architecture = renderArchitectureSnapshot({ policy, registry, config, branch: { protected: false, protection: { required_status_checks: { enforcement_level: 'off' } } } });
assert.ok(architecture.includes('NOT_ENFORCED')); assert.ok(architecture.includes('#440')); assert.ok(architecture.includes('CLEAR / ATTENTION / INCIDENT / UNKNOWN'));

const liveSource = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/documentation-stream/live.cjs'), 'utf8');
assert.ok(liveSource.includes('PUSH_PATH_FALLBACK'));
assert.ok(liveSource.includes('/commits/${sha}'));
const liveWorkflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-docs.yml'), 'utf8');
assert.ok(liveWorkflow.includes('issues: write')); assert.ok(liveWorkflow.includes('branch_protection_rule')); assert.ok(liveWorkflow.includes('workflows: [Canonical Main Operations]')); assert.ok(!liveWorkflow.includes('contents: write')); assert.ok(!liveWorkflow.includes('git push'));
const promotionWorkflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-doc-promotion.yml'), 'utf8');
assert.ok(promotionWorkflow.includes('pull-requests: write'));
assert.ok(promotionWorkflow.includes('issues: write'));
assert.ok(promotionWorkflow.includes('actions: write'));
assert.ok(promotionWorkflow.includes('gh workflow run plugin-control-plane-ci.yml --ref "$DOC_BRANCH"'));

const simcoreDispatchStart = promotionWorkflow.indexOf('gh workflow run simcore-ci.yml --ref "$DOC_BRANCH"');
const simcoreDispatchEnd = promotionWorkflow.indexOf('echo "CANONICAL_MAIN_DOC_PROMOTION:CHECKS_DISPATCHED:$HEAD_SHA"', simcoreDispatchStart);
assert.notEqual(simcoreDispatchStart, -1);
assert.notEqual(simcoreDispatchEnd, -1);
const simcoreDispatch = promotionWorkflow.slice(simcoreDispatchStart, simcoreDispatchEnd);
assert.ok(simcoreDispatch.includes('--ref "$DOC_BRANCH"'));
assert.ok(simcoreDispatch.includes('-f profile=MAIN_HEALTH'));
assert.ok(!simcoreDispatch.includes('CANDIDATE_SHADOW'));
assert.ok(!simcoreDispatch.includes('candidate_commit'));
assert.ok(!simcoreDispatch.includes('candidate_fetch_ref'));

const findRunStart = promotionWorkflow.indexOf('find_run() {');
const findRunEnd = promotionWorkflow.indexOf('wait_for_run() {', findRunStart);
assert.notEqual(findRunStart, -1);
assert.notEqual(findRunEnd, -1);
const findRunBlock = promotionWorkflow.slice(findRunStart, findRunEnd);
assert.ok(findRunBlock.includes('headSha =='));
assert.ok(findRunBlock.includes('$HEAD_SHA'));

assert.ok(promotionWorkflow.includes('--match-head-commit'));
assert.ok(promotionWorkflow.includes('BASE_SHA'));
assert.ok(promotionWorkflow.includes('[repo-docs-generated]'));
assert.ok(promotionWorkflow.includes('git status --porcelain -- $DOC_FILES'));
assert.ok(promotionWorkflow.includes('git clean -fd -- $DOC_FILES'));
assert.ok(promotionWorkflow.includes("HANDOFF_ISSUE: '457'"));
assert.ok(promotionWorkflow.includes('canonical-main-doc-promotion-handoff:v1'));
assert.ok(promotionWorkflow.includes('CANONICAL_MAIN_DOC_PROMOTION:HANDOFF'));
assert.ok(promotionWorkflow.includes('gh issue edit "$HANDOFF_ISSUE"'));
assert.ok(!promotionWorkflow.includes('gh pr create'));
assert.ok(!promotionWorkflow.includes('git push origin main'));
console.log('documentation-stream-contract: ok');
