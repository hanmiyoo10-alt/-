'use strict';

const fs = require('node:fs');
const path = require('node:path');

const COVERAGE_STATES = new Set(['OPT_IN_PROVEN', 'INSTALLED_OPT_IN', 'REQUIRED_INSTALLED', 'UNGATED']);

function routeKey(route) {
  return [
    route.adapterId,
    route.capability,
    route.mutationClass,
    route.targetKind,
    route.target,
  ].join('::');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function evaluateCoverage({ registry, evidence, readSurface }) {
  if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.adapters)) {
    throw new Error('COVERAGE_ADAPTER_REGISTRY_INVALID');
  }
  if (!evidence || evidence.schemaVersion !== 1 || evidence.mode !== 'MUTATION_ENFORCEMENT_COVERAGE_EVIDENCE' || !Array.isArray(evidence.rows)) {
    throw new Error('COVERAGE_EVIDENCE_INVALID');
  }
  if (typeof readSurface !== 'function') {
    throw new Error('COVERAGE_SURFACE_READER_INVALID');
  }

  const routes = [];
  for (const adapter of registry.adapters) {
    const required = new Set(adapter.receiptRequiredFor || []);
    for (const route of adapter.routes || []) {
      if (route.executionClass !== 'MUTATING') continue;
      const row = {
        adapterId: adapter.adapterId,
        capability: route.capability,
        mutationClass: route.mutationClass,
        targetKind: route.targetKind,
        target: route.target,
        invokePolicy: route.invokePolicy,
      };
      if (!row.mutationClass || !required.has(row.mutationClass)) {
        throw new Error(`COVERAGE_RECEIPT_REQUIREMENT_MISSING:${routeKey(row)}`);
      }
      routes.push(row);
    }
  }

  routes.sort((a, b) => routeKey(a).localeCompare(routeKey(b)));

  const evidenceByKey = new Map();
  for (const row of evidence.rows) {
    const key = routeKey(row);
    if (evidenceByKey.has(key)) {
      throw new Error(`COVERAGE_EVIDENCE_DUPLICATE:${key}`);
    }
    evidenceByKey.set(key, row);
  }

  const routeKeys = new Set(routes.map(routeKey));
  for (const key of evidenceByKey.keys()) {
    if (!routeKeys.has(key)) {
      throw new Error(`COVERAGE_EVIDENCE_ORPHAN:${key}`);
    }
  }

  const rows = routes.map((route) => {
    const key = routeKey(route);
    const evidenceRow = evidenceByKey.get(key);
    if (!evidenceRow) {
      throw new Error(`COVERAGE_EVIDENCE_MISSING:${key}`);
    }
    if (!COVERAGE_STATES.has(evidenceRow.enforcementState)) {
      throw new Error(`COVERAGE_STATE_INVALID:${key}:${evidenceRow.enforcementState}`);
    }
    if (typeof evidenceRow.enforcementSurface !== 'string' || evidenceRow.enforcementSurface.length === 0) {
      throw new Error(`COVERAGE_SURFACE_MISSING:${key}`);
    }

    let surface;
    try {
      surface = readSurface(evidenceRow.enforcementSurface);
    } catch (error) {
      throw new Error(`COVERAGE_SURFACE_UNREADABLE:${key}:${evidenceRow.enforcementSurface}`);
    }
    if (typeof surface !== 'string') {
      throw new Error(`COVERAGE_SURFACE_INVALID:${key}:${evidenceRow.enforcementSurface}`);
    }

    const markers = Array.isArray(evidenceRow.requiredMarkers) ? evidenceRow.requiredMarkers : null;
    const forbiddenMarkers = Array.isArray(evidenceRow.forbiddenMarkers) ? evidenceRow.forbiddenMarkers : [];
    const proofRefs = Array.isArray(evidenceRow.proofRefs) ? evidenceRow.proofRefs : null;
    if (!markers || !proofRefs) {
      throw new Error(`COVERAGE_EVIDENCE_SHAPE_INVALID:${key}`);
    }

    if (evidenceRow.enforcementState === 'UNGATED') {
      if (markers.length !== 0 || forbiddenMarkers.length !== 0 || proofRefs.length !== 0) {
        throw new Error(`COVERAGE_UNGATED_EVIDENCE_INVALID:${key}`);
      }
    } else {
      if (markers.length === 0) {
        throw new Error(`COVERAGE_GATED_MARKERS_MISSING:${key}`);
      }
      for (const marker of markers) {
        if (typeof marker !== 'string' || marker.length === 0 || !surface.includes(marker)) {
          throw new Error(`COVERAGE_GATE_MARKER_MISSING:${key}:${marker}`);
        }
      }
      for (const marker of forbiddenMarkers) {
        if (typeof marker !== 'string' || marker.length === 0) {
          throw new Error(`COVERAGE_FORBIDDEN_MARKER_INVALID:${key}`);
        }
        if (surface.includes(marker)) {
          throw new Error(`COVERAGE_FORBIDDEN_MARKER_PRESENT:${key}:${marker}`);
        }
      }
      if (evidenceRow.enforcementState === 'OPT_IN_PROVEN' && proofRefs.length === 0) {
        throw new Error(`COVERAGE_PROOF_MISSING:${key}`);
      }
    }

    return {
      ...clone(route),
      receiptRequired: true,
      enforcementState: evidenceRow.enforcementState,
      enforcementSurface: evidenceRow.enforcementSurface,
      proofRefs: clone(proofRefs),
      note: String(evidenceRow.note || ''),
      coordinationReadyOnly: true,
      mutationAuthorized: false,
      executionAuthorized: false,
    };
  });

  const counts = {
    totalMutatingRoutes: rows.length,
    optInProven: rows.filter((row) => row.enforcementState === 'OPT_IN_PROVEN').length,
    installedOptIn: rows.filter((row) => row.enforcementState === 'INSTALLED_OPT_IN').length,
    requiredInstalled: rows.filter((row) => row.enforcementState === 'REQUIRED_INSTALLED').length,
    ungated: rows.filter((row) => row.enforcementState === 'UNGATED').length,
  };

  return {
    schemaVersion: 1,
    mode: 'MUTATION_ENFORCEMENT_COVERAGE',
    status: 'COVERAGE_COMPLETE',
    counts,
    rows,
    ungatedRouteKeys: rows
      .filter((row) => row.enforcementState === 'UNGATED')
      .map(routeKey),
    authorityNeutral: true,
    mutationAuthorized: false,
    executionAuthorized: false,
    nextLegalAction: 'REVIEW_UNGATED_ROUTES_AND_ACTIVATE_ONE_BOUNDED_PACKET',
  };
}

function buildCoverage({ root = path.resolve(__dirname, '../../../..') } = {}) {
  const registryPath = path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/executor-adapters.json');
  const evidencePath = path.join(root, '.github/plugin-control-plane/canonical-main/work-harness/mutation-enforcement-evidence.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  return evaluateCoverage({
    registry,
    evidence,
    readSurface(surface) {
      return fs.readFileSync(path.join(root, surface), 'utf8');
    },
  });
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(buildCoverage(), null, 2)}\n`);
  } catch (error) {
    console.error(error && error.message ? error.message : String(error));
    process.exit(2);
  }
}

module.exports = {
  COVERAGE_STATES,
  routeKey,
  evaluateCoverage,
  buildCoverage,
};
