'use strict';

const { validateWorkRecord } = require('./contract.cjs');
const { evaluateWorkSet, hashRecords } = require('./preflight.cjs');

const WORK_RECORD_START = '<!-- repository-work-record:v1 -->';
const WORK_RECORD_END = '<!-- /repository-work-record:v1 -->';

function provenance(issue) {
  return {
    issueNumber: issue.number ?? null,
    issueUrl: issue.html_url || issue.url || null,
    title: issue.title || null,
  };
}

function parseIssueWorkRecord(issue) {
  if (!issue || typeof issue !== 'object') {
    return { marked: false, error: 'DISCOVERY_ISSUE_INVALID', provenance: provenance({}) };
  }
  if (issue.pull_request || issue.state !== 'open') return { marked: false, ignored: true, provenance: provenance(issue) };

  const body = typeof issue.body === 'string' ? issue.body : '';
  const start = body.indexOf(WORK_RECORD_START);
  const endOnly = body.indexOf(WORK_RECORD_END);
  if (start < 0 && endOnly < 0) return { marked: false, provenance: provenance(issue) };
  if (start < 0) return { marked: true, error: 'DISCOVERY_START_MARKER_MISSING', provenance: provenance(issue) };
  if (body.indexOf(WORK_RECORD_START, start + WORK_RECORD_START.length) >= 0) {
    return { marked: true, error: 'DISCOVERY_MULTIPLE_START_MARKERS', provenance: provenance(issue) };
  }

  const end = body.indexOf(WORK_RECORD_END, start + WORK_RECORD_START.length);
  if (end < 0) return { marked: true, error: 'DISCOVERY_END_MARKER_MISSING', provenance: provenance(issue) };
  if (body.indexOf(WORK_RECORD_END, end + WORK_RECORD_END.length) >= 0) {
    return { marked: true, error: 'DISCOVERY_MULTIPLE_END_MARKERS', provenance: provenance(issue) };
  }
  if (end <= start) return { marked: true, error: 'DISCOVERY_MARKER_ORDER_INVALID', provenance: provenance(issue) };

  const payload = body.slice(start + WORK_RECORD_START.length, end).trim();
  const match = payload.match(/^```json\s*\n([\s\S]*?)\n```$/);
  if (!match) return { marked: true, error: 'DISCOVERY_JSON_FENCE_INVALID', provenance: provenance(issue) };

  let record;
  try {
    record = JSON.parse(match[1]);
  } catch {
    return { marked: true, error: 'DISCOVERY_JSON_INVALID', provenance: provenance(issue) };
  }

  const validation = validateWorkRecord(record);
  if (!validation.ok) {
    return {
      marked: true,
      error: 'DISCOVERY_WORK_RECORD_INVALID',
      validationErrors: validation.errors,
      provenance: provenance(issue),
    };
  }

  return { marked: true, record, provenance: provenance(issue) };
}

function discoverActiveWorkRecords(issues) {
  if (!Array.isArray(issues)) {
    return {
      schemaVersion: 1,
      mode: 'SHADOW',
      records: [],
      provenance: [],
      errors: [{ code: 'DISCOVERY_ISSUE_SET_INVALID', provenance: provenance({}) }],
      scannedIssueCount: 0,
      markedIssueCount: 0,
    };
  }

  const records = [];
  const recordProvenance = [];
  const errors = [];
  let markedIssueCount = 0;

  for (const issue of issues) {
    const parsed = parseIssueWorkRecord(issue);
    if (!parsed.marked) {
      if (parsed.error) errors.push({ code: parsed.error, provenance: parsed.provenance });
      continue;
    }
    markedIssueCount += 1;
    if (parsed.error) {
      errors.push({
        code: parsed.error,
        validationErrors: parsed.validationErrors || [],
        provenance: parsed.provenance,
      });
      continue;
    }
    records.push(parsed.record);
    recordProvenance.push({ workId: parsed.record.workId, ...parsed.provenance });
  }

  const seen = new Map();
  for (const entry of recordProvenance) {
    const prior = seen.get(entry.workId);
    if (prior) {
      errors.push({
        code: `DISCOVERY_DUPLICATE_WORK_ID:${entry.workId}`,
        provenance: [prior, entry],
      });
    } else {
      seen.set(entry.workId, entry);
    }
  }

  return {
    schemaVersion: 1,
    mode: 'SHADOW',
    records,
    provenance: recordProvenance,
    errors,
    scannedIssueCount: issues.length,
    markedIssueCount,
  };
}

function evaluateDiscoveredWork(discovery) {
  const safe = discovery && typeof discovery === 'object' ? discovery : {};
  const base = {
    schemaVersion: 1,
    mode: 'SHADOW',
    discovery: {
      scannedIssueCount: safe.scannedIssueCount || 0,
      markedIssueCount: safe.markedIssueCount || 0,
      activeRecordCount: Array.isArray(safe.records) ? safe.records.length : 0,
      provenance: safe.provenance || [],
      errors: safe.errors || [],
    },
  };

  if (!discovery || !Array.isArray(discovery.records) || !Array.isArray(discovery.errors)) {
    return {
      ...base,
      profileHash: hashRecords([]),
      startability: 'BLOCKED_UNKNOWN',
      disposition: 'PARALLEL_BLOCKED',
      reasonCodes: ['DISCOVERY_RESULT_INVALID'],
      guards: [],
      pairResults: [],
    };
  }

  if (discovery.errors.length) {
    return {
      ...base,
      profileHash: hashRecords(discovery.records),
      startability: 'BLOCKED_UNKNOWN',
      disposition: 'PARALLEL_BLOCKED',
      reasonCodes: discovery.errors.map((entry) => entry.code).sort(),
      guards: [],
      pairResults: [],
    };
  }

  if (discovery.records.length === 0) {
    return {
      ...base,
      profileHash: hashRecords([]),
      startability: 'STARTABLE',
      disposition: 'PARALLEL_SAFE',
      reasonCodes: ['NO_ACTIVE_WORK_RECORDS'],
      guards: [],
      pairResults: [],
    };
  }

  return { ...evaluateWorkSet(discovery.records), discovery: base.discovery };
}

async function scanRepositoryActiveWork({ issueStore } = {}) {
  if (!issueStore || typeof issueStore.listIssues !== 'function') {
    return evaluateDiscoveredWork({
      records: [],
      provenance: [],
      errors: [{ code: 'DISCOVERY_ISSUE_STORE_INVALID', provenance: provenance({}) }],
      scannedIssueCount: 0,
      markedIssueCount: 0,
    });
  }
  const issues = await issueStore.listIssues('open');
  return evaluateDiscoveredWork(discoverActiveWorkRecords(issues));
}

module.exports = {
  WORK_RECORD_START,
  WORK_RECORD_END,
  parseIssueWorkRecord,
  discoverActiveWorkRecords,
  evaluateDiscoveredWork,
  scanRepositoryActiveWork,
};
