'use strict';

function parseRefresh(body = '') {
  const match = body.match(/Last refreshed:\s*([^\n]+)/);
  if (!match) return null;
  const ms = Date.parse(match[1].trim());
  return Number.isFinite(ms) ? ms : null;
}
function projectRows(registry, openIssues, freshnessMinutes, now = Date.now()) {
  const owners = [...Object.entries(registry.plugins || {}).map(([id, owner]) => ({kind: 'plugin', id, owner})), ...Object.entries(registry.products || {}).map(([id, owner]) => ({kind: 'product', id, owner}))];
  const boundMs = freshnessMinutes * 60 * 1000;
  return owners.map(({kind, id, owner}) => {
    const issue = openIssues.find((row) => row.title === `[${kind}-status:${id}]`);
    const refreshed = issue ? parseRefresh(issue.body || '') : null;
    return {kind, id, owner, issue, refreshed, fresh: refreshed !== null && now - refreshed <= boundMs};
  });
}
async function observe(context) {
  const rows = projectRows(context.registry, context.allIssues.filter((row) => row.state === 'open'), context.policy.operations.projectStatusFreshnessMinutes);
  return {known: true, summary: rows.every((row) => row.fresh) ? 'FRESH' : 'STALE_OR_UNKNOWN', events: [], data: rows};
}
module.exports = {parseRefresh, projectRows, observe};
