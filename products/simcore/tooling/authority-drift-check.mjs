#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run as runSyncState } from './sync-state.mjs';

const ROOT = process.cwd();
const MAX_REPORT = 256 * 1024;
const TOKEN = /^[A-Za-z0-9_.-]+$/;
const NATIVE_CODES = new Set([
  'CURRENT_PRIORITY_DRIFT',
  'CURRENT_PRIORITY_UNRESOLVED',
  'R2_1_POLICY_STATUS_DRIFT',
  'R2_1_PROOF_STATUS_DRIFT',
  'R2_1_AUTHORITY_SCOPE_DRIFT',
  'CURRENT_AUTHORITY_SOURCE_UNAVAILABLE',
  'CURRENT_AUTHORITY_PARSE_AMBIGUOUS',
]);

function parseArgs(argv) {
  const out = {};
  const valueFlags = new Set([
    'root', 'manifest', 'production-identity', 'targets', 'probes', 'writer-policy',
    'current-development', 'operator-policy', 'operator-evidence', 'report',
  ]);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--') || !valueFlags.has(arg.slice(2)) || i + 1 >= argv.length) {
      throw Object.assign(new Error(`invalid argument ${arg}`), { auditCode: 'INVOCATION_ERROR' });
    }
    out[arg.slice(2)] = argv[++i];
  }
  for (const key of ['production-identity', 'report']) {
    if (!out[key]) throw Object.assign(new Error(`--${key} required`), { auditCode: 'INVOCATION_ERROR' });
  }
  return out;
}

function under(root, rel) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel)) {
    throw Object.assign(new Error(`path must be repository-relative: ${rel}`), { auditCode: 'PATH_INVALID' });
  }
  const resolved = path.resolve(root, rel);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw Object.assign(new Error(`path outside root: ${rel}`), { auditCode: 'PATH_INVALID' });
  }
  return resolved;
}

function readText(root, rel) {
  try { return fs.readFileSync(under(root, rel), 'utf8'); }
  catch (error) {
    throw Object.assign(new Error(`required source unavailable: ${rel}`), {
      auditCode: 'CURRENT_AUTHORITY_SOURCE_UNAVAILABLE',
      source: rel,
      cause: error,
    });
  }
}

function readJson(root, rel) {
  try { return JSON.parse(readText(root, rel)); }
  catch (error) {
    if (error?.auditCode) throw error;
    throw Object.assign(new Error(`invalid JSON: ${rel}`), {
      auditCode: 'CURRENT_AUTHORITY_PARSE_AMBIGUOUS',
      source: rel,
      cause: error,
    });
  }
}

function currentOperationalSection(text) {
  const match = String(text).match(/# 1\. Current Operational State\s*\n([\s\S]*?)(?=\n# 2\.|\n# Part|$)/);
  return match?.[1] || '';
}

export function parseCurrentOperationalGate(text) {
  const section = currentOperationalSection(text);
  if (!section) return { status: 'BLOCKED', code: 'CURRENT_PRIORITY_UNRESOLVED', token: null };
  const matches = [...section.matchAll(/required real long-chat scenario\s+`([A-Za-z0-9_.-]+)`\s+is pending/gi)]
    .map((m) => m[1])
    .filter((x) => TOKEN.test(x));
  const unique = [...new Set(matches)];
  if (unique.length !== 1) return { status: 'BLOCKED', code: 'CURRENT_PRIORITY_UNRESOLVED', token: null };
  return { status: 'OK', code: null, token: unique[0] };
}

function topStatus(text) {
  const match = String(text).match(/^Status:\s*\*\*([^\n]+)\*\*/m);
  return match?.[1]?.trim() || null;
}

export function parseOperatorAuthority(policyText, evidenceText) {
  const policyStatus = topStatus(policyText);
  const evidenceStatus = topStatus(evidenceText);
  if (!policyStatus || !evidenceStatus) return { status: 'BLOCKED' };

  const normalizedPolicy = String(policyText).replace(/\*/g, '');
  const normalizedEvidence = String(evidenceText).replace(/\*/g, '');
  const active = /ACTIVE POLICY/i.test(policyStatus) && /POLICY ACTIVE/i.test(evidenceStatus);
  const pending = /AWAITING GENUINE RELEASE PROOF/i.test(policyStatus)
    && /AWAITING GENUINE RELEASE PROOF/i.test(evidenceStatus);
  const proven = /GENUINE RELEASE PROOF[^\n]*(?:PROVEN|COMPLETE|PASS)/i.test(policyStatus)
    && /GENUINE RELEASE PROOF[^\n]*(?:PROVEN|COMPLETE|PASS)/i.test(evidenceStatus);
  const backgroundFalse = /not standing authority for autonomous or background releases/i.test(normalizedPolicy)
    && /standing\/background release authority\s*=\s*NO/i.test(normalizedEvidence);

  if (!active || (!pending && !proven) || !backgroundFalse) return { status: 'BLOCKED' };
  return {
    status: 'OK',
    active: true,
    proof: pending ? 'PENDING' : 'PROVEN',
    backgroundReleaseAuthority: false,
  };
}

function r21CurrentSummary(text) {
  const section = currentOperationalSection(text);
  const match = section.match(/R2\.1 delegated operation[\s\S]{0,800}?(?=\n\n|$)/i);
  const summary = match?.[0] || '';
  return {
    present: Boolean(summary),
    contradictsActive: /\b(?:PLANNED|INACTIVE|NOT ACTIVE)\b/i.test(summary),
    claimsProven: /(?:fully\s+proven|GENUINE RELEASE PROOF\s*(?:=|:)?\s*(?:PROVEN|PASS|COMPLETE))/i.test(summary),
    claimsBackgroundAuthority: /(?:standing|background|autonomous)[^\n]{0,80}(?:authority|release)[^\n]{0,40}(?:YES|ACTIVE|ALLOWED|ENABLED)/i.test(summary),
    acknowledgesPending: /AWAITING GENUINE RELEASE PROOF/i.test(summary),
    acknowledgesActive: /active as policy/i.test(summary) || /\bACTIVE\b/i.test(summary),
  };
}

function compactSyncFinding(finding) {
  const out = { code: String(finding?.code || 'UNKNOWN_SYNC_FINDING'), family: 'productionIdentity' };
  if (finding?.severity) out.severity = String(finding.severity);
  if (finding?.path) out.path = String(finding.path);
  if (finding?.probeId) out.probeId = String(finding.probeId);
  return out;
}

function nativeFinding(code, family, sourceA = null, sourceB = null) {
  if (!NATIVE_CODES.has(code)) throw new Error(`unsupported native finding ${code}`);
  const out = { code, family };
  if (sourceA) out.sourceA = sourceA;
  if (sourceB) out.sourceB = sourceB;
  return out;
}

export function auditAuthorityState({
  syncReport,
  manifest,
  currentDevelopment,
  operatorPolicy,
  operatorEvidence,
  paths = {},
}) {
  const sourcePaths = {
    manifest: paths.manifest || 'product-manifest.json',
    currentDevelopment: paths.currentDevelopment || 'docs/CURRENT_DEVELOPMENT.md',
    operatorPolicy: paths.operatorPolicy || 'docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md',
    operatorEvidence: paths.operatorEvidence || 'docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_EVIDENCE.md',
  };

  const findings = [];
  const families = {
    productionIdentity: 'CLEAN',
    currentOperationalGate: 'CLEAN',
    currentProductionClaims: 'CLEAN',
    r2_1OperatorStatus: 'CLEAN',
  };

  if (!syncReport || syncReport.tool !== 'sync-state') {
    families.productionIdentity = 'BLOCKED';
    families.currentProductionClaims = 'BLOCKED';
    findings.push(nativeFinding('CURRENT_AUTHORITY_PARSE_AMBIGUOUS', 'productionIdentity'));
  } else {
    const syncFindings = Array.isArray(syncReport.findings) ? syncReport.findings : [];
    const currentClaimFindings = syncFindings.filter((x) => /^HUMAN_CURRENT_/.test(String(x?.code || '')));
    const identityFindings = syncFindings.filter((x) => !/^HUMAN_CURRENT_/.test(String(x?.code || '')));

    if (syncReport.result === 'CHECK_BLOCKED') families.productionIdentity = 'BLOCKED';
    else if (syncReport.result === 'CHECK_DRIFT' || identityFindings.some((x) => x?.severity === 'DRIFT' || x?.severity === 'BLOCKER')) {
      families.productionIdentity = 'DRIFT';
    }

    if (syncReport.result === 'CHECK_BLOCKED') families.currentProductionClaims = 'BLOCKED';
    else if (currentClaimFindings.length) families.currentProductionClaims = 'DRIFT';

    for (const finding of syncFindings) findings.push(compactSyncFinding(finding));
  }

  const gate = parseCurrentOperationalGate(currentDevelopment);
  if (gate.status !== 'OK') {
    families.currentOperationalGate = 'BLOCKED';
    findings.push(nativeFinding('CURRENT_PRIORITY_UNRESOLVED', 'currentOperationalGate', sourcePaths.currentDevelopment, sourcePaths.manifest));
  } else if (typeof manifest?.current_priority !== 'string' || !TOKEN.test(manifest.current_priority)) {
    families.currentOperationalGate = 'BLOCKED';
    findings.push(nativeFinding('CURRENT_AUTHORITY_PARSE_AMBIGUOUS', 'currentOperationalGate', sourcePaths.manifest));
  } else if (gate.token !== manifest.current_priority) {
    families.currentOperationalGate = 'DRIFT';
    findings.push(nativeFinding('CURRENT_PRIORITY_DRIFT', 'currentOperationalGate', sourcePaths.currentDevelopment, sourcePaths.manifest));
  }

  const operator = parseOperatorAuthority(operatorPolicy, operatorEvidence);
  const currentR21 = r21CurrentSummary(currentDevelopment);
  if (operator.status !== 'OK' || !currentR21.present) {
    families.r2_1OperatorStatus = 'BLOCKED';
    findings.push(nativeFinding('CURRENT_AUTHORITY_PARSE_AMBIGUOUS', 'r2_1OperatorStatus', sourcePaths.operatorPolicy, sourcePaths.operatorEvidence));
  } else {
    if (currentR21.contradictsActive || !currentR21.acknowledgesActive) {
      families.r2_1OperatorStatus = 'DRIFT';
      findings.push(nativeFinding('R2_1_POLICY_STATUS_DRIFT', 'r2_1OperatorStatus', sourcePaths.currentDevelopment, sourcePaths.operatorPolicy));
    }
    if ((operator.proof === 'PENDING' && (currentR21.claimsProven || !currentR21.acknowledgesPending))
      || (operator.proof === 'PROVEN' && currentR21.acknowledgesPending)) {
      families.r2_1OperatorStatus = 'DRIFT';
      findings.push(nativeFinding('R2_1_PROOF_STATUS_DRIFT', 'r2_1OperatorStatus', sourcePaths.currentDevelopment, sourcePaths.operatorEvidence));
    }
    if (operator.backgroundReleaseAuthority === false && currentR21.claimsBackgroundAuthority) {
      families.r2_1OperatorStatus = 'DRIFT';
      findings.push(nativeFinding('R2_1_AUTHORITY_SCOPE_DRIFT', 'r2_1OperatorStatus', sourcePaths.currentDevelopment, sourcePaths.operatorPolicy));
    }
  }

  const values = Object.values(families);
  const result = values.includes('BLOCKED') ? 'AUTHORITY_BLOCKED'
    : values.includes('DRIFT') ? 'AUTHORITY_DRIFT'
      : 'AUTHORITY_CLEAN';

  return {
    schemaVersion: 1,
    tool: 'authority-drift-check',
    result,
    families,
    findings,
  };
}

function writeBoundedReport(file, report) {
  const bytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (bytes.length > MAX_REPORT) {
    throw Object.assign(new Error('authority drift report exceeds 256 KiB'), { auditCode: 'REPORT_TOO_LARGE' });
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
}

export function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const root = path.resolve(args.root || ROOT);
  const rel = {
    manifest: args.manifest || 'product-manifest.json',
    productionIdentity: args['production-identity'],
    targets: args.targets || 'products/simcore/state-sync/target-registry.json',
    probes: args.probes || 'products/simcore/state-sync/current-claim-probes.json',
    writerPolicy: args['writer-policy'] || 'products/simcore/state-sync/writer-policy.json',
    currentDevelopment: args['current-development'] || 'docs/CURRENT_DEVELOPMENT.md',
    operatorPolicy: args['operator-policy'] || 'docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md',
    operatorEvidence: args['operator-evidence'] || 'docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_EVIDENCE.md',
  };

  const syncReport = runSyncState([
    '--check',
    '--root', root,
    '--manifest', rel.manifest,
    '--production-identity', rel.productionIdentity,
    '--targets', rel.targets,
    '--probes', rel.probes,
    '--writer-policy', rel.writerPolicy,
  ]);

  const report = auditAuthorityState({
    syncReport,
    manifest: readJson(root, rel.manifest),
    currentDevelopment: readText(root, rel.currentDevelopment),
    operatorPolicy: readText(root, rel.operatorPolicy),
    operatorEvidence: readText(root, rel.operatorEvidence),
    paths: rel,
  });

  writeBoundedReport(path.resolve(args.report), report);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = run();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.result === 'AUTHORITY_CLEAN' ? 0 : report.result === 'AUTHORITY_DRIFT' ? 1 : 2;
  } catch (error) {
    const code = error?.auditCode || 'AUTHORITY_AUDIT_ERROR';
    console.error(`${code}: ${error?.message || error}`);
    process.exitCode = 2;
  }
}
