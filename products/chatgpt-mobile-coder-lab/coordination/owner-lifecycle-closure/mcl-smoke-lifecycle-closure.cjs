"use strict";

const VALID_EVIDENCE = new Set(["KNOWN", "UNKNOWN", "CONFLICT"]);
const VALID_RETENTION = new Set(["EPHEMERAL_SELF_RETIRING", "EVIDENCE_PRESERVED"]);
const VALID_COORDINATION = new Set(["CONVERGED", "ACTIVE", "UNKNOWN", "CONFLICT"]);
const VALID_BASELINE = new Set(["PRESERVED", "CHANGED", "UNKNOWN", "CONFLICT"]);
const VALID_FOREIGN = new Set(["NONE", "PRESENT", "UNKNOWN", "CONFLICT"]);
const VALID_RESIDUE = new Set(["ABSENT", "PRESENT", "UNKNOWN", "CONFLICT"]);
const VALID_RETAINED = new Set(["CURRENT", "MISSING", "UNKNOWN", "CONFLICT"]);

function refs(value, label = "evidenceRefs") {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 16
      || value.some((x) => typeof x !== "string" || !x || x.length > 240)) {
    throw new Error(`invalid ${label}`);
  }
  return [...value];
}

function text(value, label, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error(`invalid ${label}`);
  }
  return value.trim();
}

function assets(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 16) {
    throw new Error("invalid assets");
  }
  return value.map((asset) => ({
    ...asset,
    kind: text(asset?.kind, "asset.kind", 64),
    identity: text(asset?.identity, "asset.identity", 240),
  }));
}

function receipt(input, result, classification, reasonCodes = [], extra = {}) {
  return {
    schema: "mcl-smoke-lifecycle-closure-receipt.v1",
    checkpoint: input.checkpoint,
    retentionMode: input.retentionMode,
    result,
    classification,
    reasonCodes,
    evidenceRefs: refs(input.evidenceRefs),
    ...extra,
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  };
}

function globalEvidenceGate(input) {
  const state = input.evidenceState ?? "KNOWN";
  if (!VALID_EVIDENCE.has(state)) throw new Error("invalid evidenceState");
  if (state === "CONFLICT") {
    return receipt(input, "CONFLICT", "SMOKE_CLOSURE_EVIDENCE_CONFLICT", ["SMOKE_CLOSURE_EVIDENCE_CONFLICT"]);
  }
  if (state === "UNKNOWN") {
    return receipt(input, "UNKNOWN", "SMOKE_CLOSURE_EVIDENCE_UNKNOWN", ["SMOKE_CLOSURE_EVIDENCE_UNKNOWN"]);
  }
  return null;
}

function classifyPreflight(input, list) {
  if (input.retentionMode === "EPHEMERAL_SELF_RETIRING") {
    const unknown = list.filter((a) => typeof a.retirementOwnerReviewed !== "boolean");
    if (unknown.length) {
      return receipt(input, "UNKNOWN", "RETIREMENT_OWNER_EVIDENCE_UNKNOWN", ["RETIREMENT_OWNER_EVIDENCE_UNKNOWN"], {
        affectedAssets: unknown.map((a) => ({kind: a.kind, identity: a.identity})),
      });
    }
    const missing = list.filter((a) => a.retirementOwnerReviewed === false);
    if (missing.length) {
      return receipt(input, "BLOCKED", "RETIREMENT_OWNER_MISSING", ["SMOKE_RETIREMENT_OWNER_MISSING"], {
        affectedAssets: missing.map((a) => ({kind: a.kind, identity: a.identity})),
      });
    }
    return receipt(input, "PASS", "SELF_RETIRING_PREFLIGHT_COVERED");
  }

  const evidence = refs(input.durableEvidenceRefs, "durableEvidenceRefs");
  if (!evidence.length || typeof input.retentionReason !== "string" || !input.retentionReason.trim()
      || typeof input.retirementPolicyReviewed !== "boolean") {
    return receipt(input, "UNKNOWN", "PRESERVATION_POLICY_EVIDENCE_UNKNOWN", ["SMOKE_PRESERVATION_POLICY_EVIDENCE_UNKNOWN"]);
  }
  text(input.retentionReason, "retentionReason", 500);
  if (input.retirementPolicyReviewed === false) {
    return receipt(input, "BLOCKED", "PRESERVATION_POLICY_MISSING", ["SMOKE_PRESERVATION_POLICY_MISSING"]);
  }
  return receipt(input, "PASS", "EVIDENCE_PRESERVATION_DECLARED", [], {durableEvidenceRefs: evidence});
}

function terminalStateGate(input) {
  const coordination = input.coordinationState;
  const baseline = input.baselineState;
  const foreign = input.foreignResidueState;
  if (!VALID_COORDINATION.has(coordination)) throw new Error("invalid coordinationState");
  if (!VALID_BASELINE.has(baseline)) throw new Error("invalid baselineState");
  if (!VALID_FOREIGN.has(foreign)) throw new Error("invalid foreignResidueState");

  if ([coordination, baseline, foreign].includes("CONFLICT")) {
    return receipt(input, "CONFLICT", "TERMINAL_EVIDENCE_CONFLICT", ["SMOKE_TERMINAL_EVIDENCE_CONFLICT"]);
  }
  if ([coordination, baseline, foreign].includes("UNKNOWN")) {
    return receipt(input, "UNKNOWN", "TERMINAL_EVIDENCE_UNKNOWN", ["SMOKE_TERMINAL_EVIDENCE_UNKNOWN"]);
  }
  if (coordination !== "CONVERGED") {
    return receipt(input, "BLOCKED", "COORDINATION_NOT_CONVERGED", ["SMOKE_COORDINATION_NOT_CONVERGED"]);
  }
  if (baseline !== "PRESERVED") {
    return receipt(input, "BLOCKED", "BASELINE_NOT_PRESERVED", ["SMOKE_BASELINE_NOT_PRESERVED"]);
  }
  if (foreign !== "NONE") {
    return receipt(input, "BLOCKED", "FOREIGN_RESIDUE_PRESENT", ["SMOKE_FOREIGN_RESIDUE_PRESENT"]);
  }
  return null;
}

function stronger(left, right) {
  const rank = {PASS: 0, BLOCKED: 1, UNKNOWN: 2, CONFLICT: 3};
  return rank[left.result] > rank[right.result] ? left : right;
}

function classifyEphemeralTerminal(input, list) {
  for (const asset of list) {
    if (!VALID_RESIDUE.has(asset.residueState)) {
      return receipt(input, "UNKNOWN", "RESIDUE_EVIDENCE_UNKNOWN", ["SMOKE_RESIDUE_EVIDENCE_UNKNOWN"]);
    }
  }
  if (list.some((a) => a.residueState === "CONFLICT")) {
    return receipt(input, "CONFLICT", "RESIDUE_EVIDENCE_CONFLICT", ["SMOKE_RESIDUE_EVIDENCE_CONFLICT"]);
  }
  if (list.some((a) => a.residueState === "UNKNOWN")) {
    return receipt(input, "UNKNOWN", "RESIDUE_EVIDENCE_UNKNOWN", ["SMOKE_RESIDUE_EVIDENCE_UNKNOWN"]);
  }
  const present = list.filter((a) => a.residueState === "PRESENT");
  if (present.length) {
    return receipt(input, "BLOCKED", "OWNED_RESIDUE_PRESENT", ["SMOKE_OWNED_RESIDUE_PRESENT"], {
      affectedAssets: present.map((a) => ({kind: a.kind, identity: a.identity})),
    });
  }
  return receipt(input, "PASS", "ZERO_RESIDUE_TERMINAL");
}

function classifyPreservedTerminal(input, list) {
  const evidence = refs(input.durableEvidenceRefs, "durableEvidenceRefs");
  if (!evidence.length || typeof input.retentionReason !== "string" || !input.retentionReason.trim()
      || input.retirementPolicyReviewed !== true) {
    return receipt(input, "UNKNOWN", "PRESERVATION_POLICY_EVIDENCE_UNKNOWN", ["SMOKE_PRESERVATION_POLICY_EVIDENCE_UNKNOWN"]);
  }
  text(input.retentionReason, "retentionReason", 500);
  for (const asset of list) {
    if (!VALID_RETAINED.has(asset.retainedIdentityState)) {
      return receipt(input, "UNKNOWN", "RETAINED_IDENTITY_UNKNOWN", ["SMOKE_RETAINED_IDENTITY_UNKNOWN"]);
    }
  }
  if (list.some((a) => a.retainedIdentityState === "CONFLICT")) {
    return receipt(input, "CONFLICT", "RETAINED_IDENTITY_CONFLICT", ["SMOKE_RETAINED_IDENTITY_CONFLICT"]);
  }
  if (list.some((a) => a.retainedIdentityState === "UNKNOWN")) {
    return receipt(input, "UNKNOWN", "RETAINED_IDENTITY_UNKNOWN", ["SMOKE_RETAINED_IDENTITY_UNKNOWN"]);
  }
  const missing = list.filter((a) => a.retainedIdentityState === "MISSING");
  if (missing.length) {
    return receipt(input, "BLOCKED", "PRESERVED_ASSET_MISSING", ["SMOKE_PRESERVED_ASSET_MISSING"], {
      affectedAssets: missing.map((a) => ({kind: a.kind, identity: a.identity})),
    });
  }
  return receipt(input, "PASS", "EVIDENCE_PRESERVED_TERMINAL", [], {durableEvidenceRefs: evidence});
}

function classifyTerminal(input, list) {
  const state = terminalStateGate(input)
    || receipt(input, "PASS", "TERMINAL_STATE_COVERED");
  const asset = input.retentionMode === "EPHEMERAL_SELF_RETIRING"
    ? classifyEphemeralTerminal(input, list)
    : classifyPreservedTerminal(input, list);
  return stronger(state, asset);
}

function classify(input) {
  if (!input || input.schema !== "mcl-smoke-lifecycle-closure-input.v1") throw new Error("unsupported schema");
  if (!["PREFLIGHT", "TERMINAL"].includes(input.checkpoint)) throw new Error("unsupported checkpoint");
  if (!VALID_RETENTION.has(input.retentionMode)) throw new Error("unsupported retentionMode");
  const gated = globalEvidenceGate(input);
  if (gated) return gated;
  const list = assets(input.assets);
  return input.checkpoint === "PREFLIGHT" ? classifyPreflight(input, list) : classifyTerminal(input, list);
}

module.exports = { classify };
