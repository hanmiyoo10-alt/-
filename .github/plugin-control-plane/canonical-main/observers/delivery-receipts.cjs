'use strict';

const {summarizeReceipts} = require('../delivery-receipt.cjs');

async function observe(context, incidentRows) {
  const config = context.policy.notifications?.receiptTracking || {};
  const baselineProofAt = config.baselineProofAt || null;
  if (config.enabled !== true) return {known: true, summary: 'DISABLED', events: [], data: summarizeReceipts([], {baselineProofAt})};
  const maxIssues = Number.isInteger(config.maxIncidentIssues) ? config.maxIncidentIssues : 25;
  const candidates = incidentRows.filter((row) => row.severity === 'P0' || row.severity === 'P1').sort((a, b) => Date.parse(b.issue.updated_at) - Date.parse(a.issue.updated_at)).slice(0, maxIssues);
  const comments = [];
  for (const row of candidates) comments.push(...await context.issueStore.listIssueComments(row.issue.number));
  const summary = summarizeReceipts(comments, {baselineProofAt});
  return {known: true, summary: summary.health, events: [], data: summary};
}

module.exports = {observe};
