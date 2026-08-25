'use strict';

// Phase J compatibility facade. The only runtime #305 writer is orchestrator/refresh.cjs.
// Compatibility markers from the pre-J controller are documented here only: eventAdaptersComplete, observeAll,
// reconcileIncidentEvents, canonical-main-correlation, CANONICAL_MAIN_NOTIFICATION_OUTBOX, deliveryReceiptSummary,
// Notification outbox / external bridge, Current adapter observations valid, LEGACY/UNREGISTERED_FOR_STANDARD,
// /comments?per_page=100, Bridge health:, Unique duplicate suppressions recorded:, non-authoritative for release/main health.
const {refresh} = require('./orchestrator/refresh.cjs');
const projects = require('./observers/project-status.cjs');
const incidents = require('./domains/incidents.cjs');
const incidentSurface = require('./surfaces/incidents.cjs');
const notificationSurface = require('./surfaces/notifications.cjs');

async function main() {
  if (process.argv[2] !== 'refresh') throw new Error('usage: ops-controller.cjs refresh');
  await refresh();
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});

module.exports = {
  parseRefresh: projects.parseRefresh,
  ownerRows: projects.projectRows,
  incidentFromIssue: incidents.incidentFromIssue,
  eventTransition: incidents.eventTransition,
  markerForKey: incidents.markerForKey,
  markerForEvent: incidents.markerForEvent,
  renderIncidentBody: incidentSurface.renderIncidentBody,
  renderNotificationStatus: notificationSurface.renderNotificationStatus,
  refresh,
};
