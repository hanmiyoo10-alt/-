'use strict';

const START = '<!-- canonical-main-bootstrap-start -->';
const END = '<!-- canonical-main-bootstrap-end -->';
function renderBootstrapSection(coverage) {
  const rows = coverage.rows.map((row) => {
    const state = row.ready ? 'BOOTSTRAP_READY' : row.profile === 'UNREGISTERED' ? 'UNREGISTERED' : 'BOOTSTRAP_INCOMPLETE';
    const suffix = row.errors?.length ? ` — ${row.errors.map((error) => `\`${error}\``).join('; ')}` : '';
    return `- \`${row.id}\`: \`${state}\` / \`${row.profile}\`${suffix}`;
  });
  const unregistered = coverage.rows.filter((row) => row.profile === 'UNREGISTERED').map((row) => row.id);
  return [START, '## Bootstrap & durable-memory health', '', `- Coverage: \`${coverage.complete ? 'COMPLETE' : 'INCOMPLETE'}\` — ${coverage.readyCount}/${coverage.expectedCount} operational scopes READY`, `- Registered descriptors: ${coverage.registeredCount}/${coverage.expectedCount}`, ...rows, `- Legacy/unregistered scopes: ${unregistered.length ? unregistered.map((id) => `\`${id}\``).join(', ') : 'none'}`, END].join('\n');
}
function replaceBootstrapSection(body, section) {
  const markerPattern = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (markerPattern.test(body)) return body.replace(markerPattern, section);
  const heading = '## Bootstrap & durable-memory health', start = body.indexOf(heading), next = body.indexOf('\n## Recent recoveries', start >= 0 ? start : 0);
  if (start >= 0 && next >= 0) return `${body.slice(0, start)}${section}${body.slice(next)}`;
  if (start >= 0) return `${body.slice(0, start)}${section}\n`;
  return `${body.trimEnd()}\n\n${section}\n`;
}
module.exports = {START, END, renderBootstrapSection, replaceBootstrapSection};
