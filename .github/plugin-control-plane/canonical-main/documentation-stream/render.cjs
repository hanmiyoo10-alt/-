const fs = require('node:fs');
const path = require('node:path');
const { parseEventMarker } = require('./event.cjs');

function markdownEscape(value) { return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' '); }
function eventEntry(event) {
  const source = event.sourceUrl ? `[source](${event.sourceUrl})` : 'source unavailable';
  return [`### ${event.timestamp.slice(0, 10)} — ${event.summary}`, '', `- Class: \`${event.eventClass}\``, event.transition ? `- Transition: \`${event.transition}\`` : null, event.sha ? `- Main SHA: \`${event.sha}\`` : null, `- Provenance: ${source}`, `- Event ID: \`${event.eventId}\``, '', `<!-- canonical-main-doc-promoted:${event.eventId} -->`].filter(Boolean).join('\n');
}
function renderDecisionLog(events) {
  const decisions = events.filter((event) => event.eventClass === 'DECISION');
  return ['# Repository Decision Log', '', '> Generated from stable Phase L documentation-stream events. Pre-Phase-L design history remains authoritative in its original issues/docs.', '', decisions.length ? decisions.map(eventEntry).join('\n\n') : '_No Phase L decisions promoted yet._', ''].join('\n');
}
function renderChangeLog(events) {
  const changes = events.filter((event) => event.eventClass !== 'DECISION');
  return ['# Repository Change Log', '', '> Generated from stable repository documentation events. This is a semantic log, not a raw Git commit list.', '', changes.length ? changes.map(eventEntry).join('\n\n') : '_No Phase L changes promoted yet._', ''].join('\n');
}
function authorityText(authority) { return authority ? Object.entries(authority).map(([key, value]) => `${key}=${value}`).join('; ') : '—'; }
function descriptorMap(root) {
  const dir = path.join(root, '.github/plugin-control-plane/canonical-main/descriptors'); const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const descriptor = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const id = descriptor.id || descriptor.plugin || descriptor.projectId || path.basename(name, '.json'); map.set(id, descriptor);
  }
  return map;
}
function renderProjectCatalog({ registry, root }) {
  const descriptors = descriptorMap(root); const rows = [];
  for (const [id, item] of Object.entries(registry.plugins || {})) {
    const descriptor = descriptors.get(id) || {};
    rows.push([`plugin:${id}`, item.displayName || id, item.lifecycle || 'unknown', (item.paths || [])[0] || '—', authorityText(item.authority), descriptor.guidelines || descriptor.guidelinesPath || 'registered/inferred']);
  }
  for (const [id, item] of Object.entries(registry.products || {})) {
    const descriptor = descriptors.get(id) || {};
    rows.push([`product:${id}`, item.displayName || id, item.lifecycle || 'unknown', (item.paths || [])[0] || '—', authorityText(item.authority), descriptor.guidelines || descriptor.guidelinesPath || 'registered/inferred']);
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  const table = rows.map((row) => `| ${row.map(markdownEscape).join(' | ')} |`).join('\n');
  return ['# Repository Project Catalog', '', '> Generated from `.github/plugin-control-plane/registry.json` and canonical-main descriptors. Operational freshness remains on status issues/#305 rather than this durable catalog.', '', '| Scope | Name | Lifecycle | Primary path | Authority | Guidelines |', '| --- | --- | --- | --- | --- | --- |', table || '| — | — | — | — | — | — |', ''].join('\n');
}
function renderArchitectureSnapshot({ policy, registry, config, branch }) {
  const writers = (policy.adapters?.writerInventory || []).map((item) => `- \`${item.workflow}\` — \`${item.mode}\``).join('\n');
  const classes = (config.eventClasses || []).map((item) => `\`${item}\``).join(', ');
  const protectedState = branch?.protected === true ? 'ENFORCED/PROTECTED' : 'NOT_ENFORCED';
  const requiredEnforcement = branch?.protection?.required_status_checks?.enforcement_level || 'off';
  const projectCount = Object.keys(registry.plugins || {}).length + Object.keys(registry.products || {}).length;
  return ['# Repository Architecture Snapshot', '', '> Generated durable snapshot of canonical-main control-plane configuration. Live operational health remains on #305.', '', '## Canonical integration', '', '- Branch: `main`', `- Native branch protection: \`${protectedState}\``, `- Required status-check enforcement: \`${requiredEnforcement}\``, `- Required target: \`${policy.adapters?.requiredCi?.workflow || 'unknown'} / ${policy.adapters?.requiredCi?.requiredJob || 'unknown'}\``, '- Shared main writer: `scripts/repo-main-write.py`', '', '## Operator model', '', '- Public states: `CLEAR / ATTENTION / INCIDENT / UNKNOWN`', `- Event adapters complete: \`${Boolean(policy.operations?.eventAdaptersComplete)}\``, `- Convergence budget: \`${policy.stability?.convergenceBudgetSeconds ?? 'unknown'}s\``, `- Flap threshold: \`${policy.stability?.flapThreshold ?? 'unknown'}\``, '', '## Notification bridge', '', `- Channel(s): \`${(policy.notifications?.channels || []).join(', ') || 'none'}\``, `- Delivery bridge: \`${policy.notifications?.deliveryBridge || 'none'}\``, `- Bridge state: \`${policy.notifications?.bridgeState || 'unknown'}\``, '', '## Documentation stream', '', `- Live issue: #${config.liveIssueNumber} \`${config.liveIssueTitle}\``, `- Event classes: ${classes}`, '- Durable promotion: branch/PR + explicit CI dispatch; exact-head merge only when base main is unchanged.', '- Generated commits are filtered with `[repo-docs-generated]` to prevent recursive documentation.', '', `## Registered projects/products (${projectCount})`, '', '- Source: `.github/plugin-control-plane/registry.json`', '- Detailed durable view: `docs/REPO_PROJECT_CATALOG.md`', '', '## Main-writer inventory', '', writers || '- none', ''].join('\n');
}
function eventsFromComments(comments) {
  const byId = new Map();
  for (const comment of comments || []) { const event = parseEventMarker(comment.body || ''); if (event?.stable === true) byId.set(event.eventId, event); }
  return [...byId.values()].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)) || a.eventId.localeCompare(b.eventId));
}
module.exports = { eventEntry, renderDecisionLog, renderChangeLog, renderProjectCatalog, renderArchitectureSnapshot, eventsFromComments };
