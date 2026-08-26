const crypto = require('node:crypto');

const EVENT_CLASSES = Object.freeze(['DECISION', 'CHANGE', 'INCIDENT', 'RECOVERY', 'AUTHORITY', 'PROJECT']);
const GENERATED_MARKER = '[repo-docs-generated]';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function eventId(event) {
  const identity = { schemaVersion: 1, eventClass: event.eventClass, sourceType: event.sourceType, sourceId: event.sourceId, transition: event.transition || null, sha: event.sha || null };
  return crypto.createHash('sha256').update(stableJson(identity)).digest('hex');
}
function changedPathsFromPush(payload) {
  const paths = new Set();
  const commits = [...(payload.commits || [])];
  if (payload.head_commit) commits.push(payload.head_commit);
  for (const commit of commits) for (const key of ['added', 'modified', 'removed']) for (const p of commit[key] || []) paths.add(p);
  return [...paths].sort();
}
function isDocumentationGenerated(message = '') { return String(message).includes(GENERATED_MARKER); }
function classifyPushPaths(paths) {
  const projectChange = paths.some((p) => p === '.github/plugin-control-plane/registry.json' || p.includes('/descriptors/') || /docs\/.+_GUIDELINES\.md$/.test(p));
  if (projectChange) return 'PROJECT';
  const repoChange = paths.some((p) => p.startsWith('.github/plugin-control-plane/') || p.startsWith('.github/workflows/canonical-main-') || p === 'scripts/repo-main-write.py' || /^docs\/REPO_[A-Z0-9_]+\.md$/.test(p));
  return repoChange ? 'CHANGE' : null;
}
function compactSummary(text, max = 180) {
  const one = String(text || '').trim().split('\n')[0].trim();
  return one.length <= max ? one : `${one.slice(0, max - 1)}…`;
}
function canonicalIncidentMarker(body = '') {
  return String(body).match(/<!-- canonical-main-event:([A-Za-z0-9_-]+) -->/)?.[1] || null;
}
function incidentEventFromIssue(issue) {
  const labels = new Set((issue.labels || []).map((label) => typeof label === 'string' ? label : label.name));
  if (!labels.has('control-plane:incident')) return null;
  const recovered = labels.has('incident:recovered') || issue.state === 'closed';
  const transition = recovered ? 'RECOVERED' : 'OPEN';
  const sourceMarker = canonicalIncidentMarker(issue.body) || `${transition}:${issue.updated_at || 'unknown'}`;
  const event = {
    schemaVersion: 1,
    eventClass: recovered ? 'RECOVERY' : 'INCIDENT',
    sourceType: 'incident-issue',
    sourceId: `${issue.number}:${sourceMarker}`,
    transition,
    sha: null,
    timestamp: issue.updated_at || new Date().toISOString(),
    summary: compactSummary(issue.title),
    sourceUrl: issue.html_url || null,
    evidence: [`issue:#${issue.number}`, `state:${issue.state || 'unknown'}`, `transition:${transition}`],
    stable: true,
  };
  event.eventId = eventId(event);
  return event;
}
function normalizeEvent({ eventName, payload, repository }) {
  if (!eventName || !payload) return null;
  if (eventName === 'push') {
    if (payload.ref && payload.ref !== 'refs/heads/main') return null;
    const message = payload.head_commit?.message || '';
    if (isDocumentationGenerated(message)) return null;
    const paths = changedPathsFromPush(payload);
    const eventClass = classifyPushPaths(paths);
    if (!eventClass) return null;
    const sha = payload.after || payload.head_commit?.id;
    const event = { schemaVersion: 1, eventClass, sourceType: 'push', sourceId: sha, transition: 'MERGED_TO_MAIN', sha, timestamp: payload.head_commit?.timestamp || new Date().toISOString(), summary: compactSummary(message) || `Meaningful ${eventClass.toLowerCase()} change merged to main.`, sourceUrl: repository && sha ? `https://github.com/${repository}/commit/${sha}` : null, evidence: paths.slice(0, 30), stable: true };
    event.eventId = eventId(event); return event;
  }
  if (eventName === 'issues') {
    const issue = payload.issue || {};
    if (issue.number === 440 || issue.title === '[repo-docs:main]') return null;
    const incident = incidentEventFromIssue(issue);
    if (incident && ['opened', 'reopened', 'closed'].includes(payload.action)) return incident;
    if (payload.action === 'closed' && /^\[design\]/i.test(issue.title || '')) {
      const event = { schemaVersion: 1, eventClass: 'DECISION', sourceType: 'issue', sourceId: String(issue.number), transition: 'CLOSED_COMPLETED', sha: null, timestamp: issue.closed_at || issue.updated_at || new Date().toISOString(), summary: compactSummary(issue.title.replace(/^\[design\]\s*/i, '')), sourceUrl: issue.html_url || null, evidence: [`issue:#${issue.number}`, 'state:closed'], stable: true };
      event.eventId = eventId(event); return event;
    }
    return null;
  }
  if (eventName === 'branch_protection_rule') {
    const rule = payload.rule || {};
    const event = { schemaVersion: 1, eventClass: 'AUTHORITY', sourceType: 'branch_protection_rule', sourceId: String(rule.id || payload.action || 'main-protection'), transition: String(payload.action || 'changed').toUpperCase(), sha: null, timestamp: new Date().toISOString(), summary: `GitHub branch protection rule ${payload.action || 'changed'}.`, sourceUrl: repository ? `https://github.com/${repository}/settings/branches` : null, evidence: [`rule:${rule.name || rule.id || 'unknown'}`], stable: true };
    event.eventId = eventId(event); return event;
  }
  return null;
}
function markerForEvent(event) { return `<!-- canonical-main-doc-event:${Buffer.from(JSON.stringify(event), 'utf8').toString('base64url')} -->`; }
function parseEventMarker(text) {
  const match = String(text || '').match(/<!-- canonical-main-doc-event:([A-Za-z0-9_-]+) -->/); if (!match) return null;
  try { const event = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')); return EVENT_CLASSES.includes(event.eventClass) && event.eventId ? event : null; } catch { return null; }
}
function renderLiveComment(event) {
  const evidence = (event.evidence || []).slice(0, 12).map((item) => `- \`${String(item).replace(/`/g, '')}\``).join('\n');
  return [`### ${event.eventClass} — ${event.summary}`, '', `- Event ID: \`${event.eventId}\``, `- Stable: \`${event.stable === true}\``, event.transition ? `- Transition: \`${event.transition}\`` : null, event.sha ? `- Main SHA: \`${event.sha}\`` : null, event.sourceUrl ? `- Source: ${event.sourceUrl}` : null, `- Observed: ${event.timestamp}`, evidence ? `\nEvidence\n${evidence}` : null, '', markerForEvent(event)].filter(Boolean).join('\n');
}
module.exports = { EVENT_CLASSES, GENERATED_MARKER, stableJson, eventId, changedPathsFromPush, isDocumentationGenerated, classifyPushPaths, canonicalIncidentMarker, incidentEventFromIssue, normalizeEvent, markerForEvent, parseEventMarker, renderLiveComment };
