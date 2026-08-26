'use strict';

const fs = require('node:fs');

function text(value, fallback = 'UNKNOWN') {
  return typeof value === 'string' && value.length ? value : fallback;
}

function list(items) {
  return Array.isArray(items) && items.length ? items : [];
}

function renderShadowSummary(result, metadata = {}) {
  const safe = result && typeof result === 'object' ? result : {};
  const discovery = safe.discovery && typeof safe.discovery === 'object' ? safe.discovery : {};
  const lines = [
    '# Repository Work Harness — Shadow Scan',
    '',
    `- Mode: \`${text(safe.mode, 'SHADOW')}\``,
    `- Active records: \`${Number.isInteger(discovery.activeRecordCount) ? discovery.activeRecordCount : 0}\``,
    `- Scanned issues: \`${Number.isInteger(discovery.scannedIssueCount) ? discovery.scannedIssueCount : 0}\``,
    `- Marked issues: \`${Number.isInteger(discovery.markedIssueCount) ? discovery.markedIssueCount : 0}\``,
    `- Startability: \`${text(safe.startability)}\``,
    `- Disposition: \`${text(safe.disposition)}\``,
    `- Profile hash: \`${text(safe.profileHash, 'N/A')}\``,
  ];

  if (metadata.trigger) lines.push(`- Trigger: \`${metadata.trigger}\``);
  if (metadata.repository) lines.push(`- Repository: \`${metadata.repository}\``);
  if (metadata.runUrl) lines.push(`- Run: ${metadata.runUrl}`);

  lines.push('', '## Reasons');
  const reasons = list(safe.reasonCodes);
  if (reasons.length) for (const reason of reasons) lines.push(`- \`${reason}\``);
  else lines.push('- None');

  lines.push('', '## Guards');
  const guards = list(safe.guards);
  if (guards.length) for (const guard of guards) lines.push(`- \`${guard}\``);
  else lines.push('- None');

  lines.push('', '## Active Work');
  const provenance = list(discovery.provenance);
  if (provenance.length) {
    for (const entry of provenance) {
      const issue = Number.isInteger(entry.issueNumber) ? `#${entry.issueNumber}` : 'issue:unknown';
      const workId = text(entry.workId, 'UNKNOWN_WORK');
      const title = text(entry.title, 'untitled');
      lines.push(`- \`${workId}\` — ${issue} — ${title}`);
    }
  } else {
    lines.push('- None');
  }

  const errors = list(discovery.errors);
  if (errors.length) {
    lines.push('', '## Discovery Errors');
    for (const entry of errors) lines.push(`- \`${text(entry && entry.code)}\``);
  }

  lines.push('', '> Advisory shadow evidence only. This result does not authorize or block Git, CI, main-write, release, production, or project authority.');
  return `${lines.join('\n')}\n`;
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 1) throw new Error('usage: node report.cjs <scan-json>');
  const result = JSON.parse(fs.readFileSync(argv[0], 'utf8'));
  const metadata = {
    trigger: process.env.GITHUB_EVENT_NAME || '',
    repository: process.env.GITHUB_REPOSITORY || '',
    runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : '',
  };
  process.stdout.write(renderShadowSummary(result, metadata));
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(`${error && error.message ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

module.exports = { renderShadowSummary };
