const fs = require('node:fs');

const CANONICAL_POINTER = /LIVE HEALTH:\s*direct main\s*\+\s*#485/i;
const SHA40 = /\b[0-9a-f]{40}\b/i;
const CURRENT_WORD = /\b(current|currently|live|latest|now|present|tip)\b/i;
const STRONG_CURRENT_WORD = /\b(currently|live|latest|now|present|tip)\b/i;
const HISTORICAL_WORD = /\b(historical|history|previously|prior|synchronization|packet evidence|activation snapshot|at activation|merged as|request commit)\b/i;

const REASON_CODES = Object.freeze({
  MISSING_CANONICAL_POINTER: 'MISSING_CANONICAL_POINTER',
  DUPLICATE_CANONICAL_POINTER: 'DUPLICATE_CANONICAL_POINTER',
  DUPLICATE_LIVE_MAIN_SHA: 'DUPLICATE_LIVE_MAIN_SHA',
  DUPLICATE_REQUIRED_STATE: 'DUPLICATE_REQUIRED_STATE',
  DUPLICATE_PRODUCTION_STATE: 'DUPLICATE_PRODUCTION_STATE',
  DUPLICATE_NATIVE_PROTECTION_STATE: 'DUPLICATE_NATIVE_PROTECTION_STATE',
  DUPLICATE_ISSUE_485_CURRENT_STATE: 'DUPLICATE_ISSUE_485_CURRENT_STATE',
  DUPLICATE_ACTIVE_WRITER_PROJECTION: 'DUPLICATE_ACTIVE_WRITER_PROJECTION',
  ACTIVE_WRITER_STATUS_UNRESOLVED: 'ACTIVE_WRITER_STATUS_UNRESOLVED',
});

function boundedExcerpt(line) {
  return line.trim().replace(/\s+/g, ' ').slice(0, 240);
}
function finding(code, severity, lineNumber, line, detail = undefined) {
  const item = {
    code,
    severity,
    line: lineNumber,
    excerpt: boundedExcerpt(line),
  };
  if (detail !== undefined) item.detail = detail;
  return item;
}

function clearlyHistorical(line) {
  return HISTORICAL_WORD.test(line) && !STRONG_CURRENT_WORD.test(line);
}

function isLiveMainShaClaim(line) {
  if (!SHA40.test(line) || clearlyHistorical(line)) return false;
  return /\b(current|currently|live|latest)\s+(canonical\s+)?`?main`?\b/i.test(line)
    || /\bmain\s+sha\b/i.test(line)
    || /\bsha\s+(for|of)\s+`?main`?\b/i.test(line)
    || /^\s*[-*+]?\s*MAIN\s*:/i.test(line)
    || /\bmain\s*[:=]\s*`?[0-9a-f]{40}\b/i.test(line);
}
function isRequiredStateClaim(line) {
  if (clearlyHistorical(line) || !/\bRequired\b/i.test(line)) return false;
  return /\b(PASS|FAIL|FAILED|PENDING|SUCCESS|GREEN|RED|SKIPPED|CANCELLED|QUEUED)\b/i.test(line)
    || /\brun\s+#?\d+\b/i.test(line);
}

function isProductionStateClaim(line) {
  if (clearlyHistorical(line)) return false;
  return /\bproduction(?:\s+(?:identity|state|authority))?\s*[:=-]?\s*\b(MATCH|MISMATCH|PASS|FAIL|FAILED|ACTIVE|INACTIVE|CURRENT|STALE|UNKNOWN)\b/i.test(line);
}

function isProtectionStateClaim(line) {
  if (clearlyHistorical(line)) return false;
  if (!/(native\s+(branch\s+)?protection|branch\s+protected)/i.test(line)) return false;
  return /\b(ACTIVE|INACTIVE|ENABLED|DISABLED|TRUE|FALSE|PASS|FAIL|FAILED|UNKNOWN)\b/i.test(line);
}

function isIssue485StateClaim(line) {
  if (CANONICAL_POINTER.test(line) || clearlyHistorical(line) || !/#485\b/i.test(line)) return false;
  return /\b(CLEAR|INCIDENT|BLOCKED|DEGRADED|SETTLING|STALE|STABLE|UNKNOWN)\b/i.test(line)
    && (CURRENT_WORD.test(line) || /#485\s*(is|remains|reports|shows|:|=)/i.test(line));
}
function isActiveWriterProjection(line) {
  return /\b(?:current\s+)?active[- ]writer(?:\s+projection)?\s*[:=-]/i.test(line);
}

function isAmbiguousActiveWriter(line) {
  const hasWriter = /\bactive[- ]writer\b/i.test(line);
  const hasUncertainty = /\b(possible|candidate|maybe|unverified|unresolved|unknown|uncertain)\b/i.test(line);
  return hasWriter && hasUncertainty && !isActiveWriterProjection(line);
}

function classifyQueueBody(body) {
  if (typeof body !== 'string') {
    throw new TypeError('queue body must be a string');
  }

  const lines = body.split(/\r?\n/);
  const findings = [];
  const pointerLines = [];
  const writerLines = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (CANONICAL_POINTER.test(line)) pointerLines.push(lineNumber);
    if (isActiveWriterProjection(line)) writerLines.push({lineNumber, line});
    if (isLiveMainShaClaim(line)) {
      findings.push(finding(REASON_CODES.DUPLICATE_LIVE_MAIN_SHA, 'FAIL', lineNumber, line));
    }
    if (isRequiredStateClaim(line)) {
      findings.push(finding(REASON_CODES.DUPLICATE_REQUIRED_STATE, 'FAIL', lineNumber, line));
    }
    if (isProductionStateClaim(line)) {
      findings.push(finding(REASON_CODES.DUPLICATE_PRODUCTION_STATE, 'FAIL', lineNumber, line));
    }
    if (isProtectionStateClaim(line)) {
      findings.push(finding(REASON_CODES.DUPLICATE_NATIVE_PROTECTION_STATE, 'FAIL', lineNumber, line));
    }
    if (isIssue485StateClaim(line)) {
      findings.push(finding(REASON_CODES.DUPLICATE_ISSUE_485_CURRENT_STATE, 'FAIL', lineNumber, line));
    }
    if (isAmbiguousActiveWriter(line)) {
      findings.push(finding(
        REASON_CODES.ACTIVE_WRITER_STATUS_UNRESOLVED,
        'UNKNOWN',
        lineNumber,
        line,
        'External packet/PR evidence is required before active-writer status can be asserted.',
      ));
    }
  });
  if (pointerLines.length === 0) {
    findings.push(finding(
      REASON_CODES.MISSING_CANONICAL_POINTER,
      'FAIL',
      1,
      lines[0] || '',
      'Expected exactly one LIVE HEALTH: direct main + #485 pointer.',
    ));
  } else if (pointerLines.length > 1) {
    findings.push(finding(
      REASON_CODES.DUPLICATE_CANONICAL_POINTER,
      'FAIL',
      pointerLines[1],
      lines[pointerLines[1] - 1],
      `Canonical pointer appears ${pointerLines.length} times.`,
    ));
  }

  if (writerLines.length > 1) {
    for (const duplicate of writerLines.slice(1)) {
      findings.push(finding(
        REASON_CODES.DUPLICATE_ACTIVE_WRITER_PROJECTION,
        'FAIL',
        duplicate.lineNumber,
        duplicate.line,
        `Found ${writerLines.length} unambiguous active-writer projections; maximum is 1.`,
      ));
    }
  }
  const severities = new Set(findings.map((item) => item.severity));
  const state = severities.has('FAIL')
    ? 'FAIL'
    : severities.has('UNKNOWN')
      ? 'UNKNOWN'
      : severities.has('WARN')
        ? 'WARN'
        : 'PASS';

  return {
    schemaVersion: 1,
    state,
    pointerCount: pointerLines.length,
    activeWriterProjectionCount: writerLines.length,
    findings,
  };
}

function readCliInput(filePath) {
  return filePath ? fs.readFileSync(filePath, 'utf8') : fs.readFileSync(0, 'utf8');
}

if (require.main === module) {
  const result = classifyQueueBody(readCliInput(process.argv[2]));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.state === 'FAIL') process.exitCode = 1;
  else if (result.state === 'UNKNOWN') process.exitCode = 2;
}
module.exports = {
  REASON_CODES,
  classifyQueueBody,
};
