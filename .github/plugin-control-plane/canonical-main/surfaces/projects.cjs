'use strict';

function fmtTime(ms) { return ms === null ? 'UNKNOWN' : new Date(ms).toISOString(); }
function renderProjectTable(rows) {
  const head = ['| Scope | Lifecycle | Operational view | Freshness |', '| --- | --- | --- | --- |'];
  const body = rows.map((row) => {
    const scope = `${row.kind}:${row.id}`, view = row.issue ? `#${row.issue.number}` : 'MISSING';
    const freshness = row.fresh ? `FRESH — ${fmtTime(row.refreshed)}` : row.refreshed ? `STALE — ${fmtTime(row.refreshed)}` : 'UNKNOWN';
    return `| ${scope} | ${row.owner.lifecycle || 'UNKNOWN'} | ${view} | ${freshness} |`;
  });
  return [...head, ...body].join('\n');
}
module.exports = {fmtTime, renderProjectTable};
