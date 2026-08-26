'use strict';

const {renderSummary} = require('./summary.cjs');
const {renderProtectionSection} = require('./protection.cjs');
const {renderBootstrapSection} = require('./bootstrap.cjs');
const {renderWriterStatus} = require('./writers.cjs');
const {renderNotificationStatus} = require('./notifications.cjs');
const {renderIncidentRows} = require('./incidents.cjs');
const {renderProjectTable} = require('./projects.cjs');

function renderOpsView(snapshot) {
  const protection = snapshot.observations.protection.data || {state: 'UNKNOWN', protected: false, enforcementLevel: 'unknown', requiredName: 'SimCore CI / Required', requiredApiContext: 'Required', requiredPresent: false, requiredChecks: [], writerGatewayReady: false, activeWriterCount: 0, shadowProof: 'UNKNOWN', automaticActivationAttempt: false, softEnforcementEnabled: false, softEnforcementStrategy: 'UNKNOWN', nativeProtectionEquivalent: false, writerErrors: ['protection observation unavailable']};
  return [
    '# Canonical Main — Operations View',
    '',
    '> Derived repository operations view. This issue is not a production/release authority.',
    '',
    renderSummary(snapshot),
    '',
    '<details>',
    '<summary>Operational details</summary>',
    '',
    '## Canonical evidence',
    '',
    '- Branch: `main`',
    `- Observed SHA: \`${snapshot.observedMainSha}\``,
    `- Required gate observation: ${snapshot.observations.requiredCi.summary}`,
    `- Production authority observation: ${snapshot.observations.productionAuthority.summary}`,
    `- Adapter contract complete: \`${snapshot.freshness.configuredCoverageComplete}\``,
    `- Current adapter observations valid: \`${snapshot.freshness.observationCoverageValid}\``,
    `- Project status freshness valid: \`${snapshot.freshness.projectStatusFresh}\``,
    '',
    renderProtectionSection(protection),
    '## Main-write / durable-memory adapters',
    '',
    renderWriterStatus(snapshot.observations.writers.data || []),
    '',
    '## Notification outbox / external bridge',
    '',
    renderNotificationStatus(snapshot.policy, snapshot.observations.delivery.data),
    '',
    '## Active P0/P1 incidents',
    '',
    renderIncidentRows(snapshot.incidents.active.filter((row) => row.severity === 'P0' || row.severity === 'P1')),
    '',
    '## Attention queue (P2)',
    '',
    renderIncidentRows(snapshot.incidents.attention || []),
    '',
    '## Projects / products',
    '',
    renderProjectTable(snapshot.observations.projectStatus.data || []),
    '',
    renderBootstrapSection(snapshot.bootstrapCoverage),
    '## Recent recoveries',
    '',
    renderIncidentRows(snapshot.incidents.recentRecoveries),
    '',
    '</details>',
    '',
    '<!-- canonical-main-ops-view -->',
  ].join('\n');
}
module.exports = {renderOpsView};
