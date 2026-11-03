"use strict";
const assert = require("node:assert/strict");
const { classify } = require("../mcl-smoke-lifecycle-closure.cjs");

function ephemeral(checkpoint, assets, extra = {}) {
  return {
    schema: "mcl-smoke-lifecycle-closure-input.v1",
    checkpoint,
    retentionMode: "EPHEMERAL_SELF_RETIRING",
    assets,
    evidenceRefs: ["issue:#4166"],
    ...extra,
  };
}

function preserved(checkpoint, assets, extra = {}) {
  return {
    schema: "mcl-smoke-lifecycle-closure-input.v1",
    checkpoint,
    retentionMode: "EVIDENCE_PRESERVED",
    assets,
    evidenceRefs: ["issue:#4166"],
    durableEvidenceRefs: ["checkpoint:historical-smoke"],
    retentionReason: "Physical asset retention is explicitly required by reviewed evidence policy.",
    retirementPolicyReviewed: true,
    ...extra,
  };
}

let r = classify(ephemeral("PREFLIGHT", [
  {kind:"worktree", identity:"server/notebook-live-proof", retirementOwnerReviewed:true},
  {kind:"local-ref", identity:"refs/heads/server/notebook-live-proof", retirementOwnerReviewed:true},
]));
assert.equal(r.result, "PASS");
assert.equal(r.classification, "SELF_RETIRING_PREFLIGHT_COVERED");

r = classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"server/notebook-live-proof", residueState:"ABSENT"},
  {kind:"local-ref", identity:"refs/heads/server/notebook-live-proof", residueState:"ABSENT"},
], {coordinationState:"CONVERGED", baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "PASS");
assert.equal(r.classification, "ZERO_RESIDUE_TERMINAL");

r = classify(ephemeral("PREFLIGHT", [
  {kind:"worktree", identity:"laptop/mcl-packet-4164", retirementOwnerReviewed:true},
  {kind:"local-ref", identity:"refs/heads/laptop/mcl-packet-4164", retirementOwnerReviewed:true},
  {kind:"remote-ref", identity:"refs/heads/laptop/mcl-packet-4164", retirementOwnerReviewed:true},
]));
assert.equal(r.result, "PASS");

r = classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"laptop/mcl-packet-4164", residueState:"ABSENT"},
  {kind:"local-ref", identity:"refs/heads/laptop/mcl-packet-4164", residueState:"ABSENT"},
  {kind:"remote-ref", identity:"refs/heads/laptop/mcl-packet-4164", residueState:"ABSENT"},
], {coordinationState:"CONVERGED", baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "PASS");

r = classify(ephemeral("PREFLIGHT", [
  {kind:"worktree", identity:"laptop/mcl-packet-3856", retirementOwnerReviewed:false},
]));
assert.equal(r.result, "BLOCKED");
assert.equal(r.classification, "RETIREMENT_OWNER_MISSING");

r = classify({
  schema:"mcl-smoke-lifecycle-closure-input.v1",
  checkpoint:"PREFLIGHT",
  retentionMode:"EVIDENCE_PRESERVED",
  assets:[{kind:"worktree", identity:"server/remote-pr-smoke-20260909"}],
});
assert.equal(r.result, "UNKNOWN");

r = classify(preserved("PREFLIGHT", [{kind:"worktree", identity:"server/remote-pr-smoke-20260909"}]));
assert.equal(r.result, "PASS");

r = classify(preserved("TERMINAL", [
  {kind:"worktree", identity:"server/remote-pr-smoke-20260909", retainedIdentityState:"CURRENT"},
], {coordinationState:"CONVERGED", baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "PASS");
assert.equal(r.classification, "EVIDENCE_PRESERVED_TERMINAL");

r = classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"x", residueState:"PRESENT"},
], {coordinationState:"CONVERGED", baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "BLOCKED");
assert.equal(r.classification, "OWNED_RESIDUE_PRESENT");

r = classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"x", residueState:"ABSENT"},
], {coordinationState:"CONVERGED", baselineState:"PRESERVED", foreignResidueState:"PRESENT"}));
assert.equal(r.result, "BLOCKED");
assert.equal(r.classification, "FOREIGN_RESIDUE_PRESENT");

r = classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"x", residueState:"ABSENT"},
], {coordinationState:"ACTIVE", baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "BLOCKED");
assert.equal(r.classification, "COORDINATION_NOT_CONVERGED");

r = classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"x", residueState:"ABSENT"},
], {coordinationState:"CONVERGED", baselineState:"CHANGED", foreignResidueState:"NONE"}));
assert.equal(r.result, "BLOCKED");
assert.equal(r.classification, "BASELINE_NOT_PRESERVED");

// Stronger asset evidence must not be hidden by an ordinary terminal-state blocker.
r = classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"x", residueState:"CONFLICT"},
], {coordinationState:"ACTIVE", baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "CONFLICT");
assert.equal(r.classification, "RESIDUE_EVIDENCE_CONFLICT");

r = classify(preserved("TERMINAL", [
  {kind:"worktree", identity:"historical", retainedIdentityState:"CONFLICT"},
], {coordinationState:"ACTIVE", baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "CONFLICT");
assert.equal(r.classification, "RETAINED_IDENTITY_CONFLICT");

r = classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"x", residueState:"UNKNOWN"},
], {coordinationState:"ACTIVE", baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "UNKNOWN");
assert.equal(r.classification, "RESIDUE_EVIDENCE_UNKNOWN");

// Explicit asset conflict outranks missing evidence in a different asset.
r = classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"conflict", residueState:"CONFLICT"},
  {kind:"local-ref", identity:"missing"},
], {coordinationState:"CONVERGED", baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "CONFLICT");
assert.equal(r.classification, "RESIDUE_EVIDENCE_CONFLICT");

r = classify(preserved("TERMINAL", [
  {kind:"worktree", identity:"conflict", retainedIdentityState:"CONFLICT"},
  {kind:"local-ref", identity:"missing"},
], {coordinationState:"CONVERGED", baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "CONFLICT");
assert.equal(r.classification, "RETAINED_IDENTITY_CONFLICT");

// Retained-identity conflict outranks missing preservation-policy evidence.
r = classify({
  schema:"mcl-smoke-lifecycle-closure-input.v1",
  checkpoint:"TERMINAL",
  retentionMode:"EVIDENCE_PRESERVED",
  assets:[{kind:"worktree", identity:"historical", retainedIdentityState:"CONFLICT"}],
  coordinationState:"CONVERGED",
  baselineState:"PRESERVED",
  foreignResidueState:"NONE",
});
assert.equal(r.result, "CONFLICT");
assert.equal(r.classification, "RETAINED_IDENTITY_CONFLICT");

r = classify({
  schema:"mcl-smoke-lifecycle-closure-input.v1",
  checkpoint:"TERMINAL",
  retentionMode:"EVIDENCE_PRESERVED",
  assets:[{kind:"worktree", identity:"historical", retainedIdentityState:"CURRENT"}],
  coordinationState:"CONVERGED",
  baselineState:"PRESERVED",
  foreignResidueState:"NONE",
});
assert.equal(r.result, "UNKNOWN");
assert.equal(r.classification, "PRESERVATION_POLICY_EVIDENCE_UNKNOWN");

r = classify(preserved("TERMINAL", [
  {kind:"worktree", identity:"historical", retainedIdentityState:"CURRENT"},
], {
  coordinationState:"CONVERGED",
  baselineState:"PRESERVED",
  foreignResidueState:"NONE",
  retirementPolicyReviewed:false,
}));
assert.equal(r.result, "BLOCKED");
assert.equal(r.classification, "PRESERVATION_POLICY_MISSING");

// Missing terminal-state evidence is explicit UNKNOWN, not an exception.
for (const missingKey of ["coordinationState", "baselineState", "foreignResidueState"]) {
  const terminal = {
    coordinationState:"CONVERGED",
    baselineState:"PRESERVED",
    foreignResidueState:"NONE",
  };
  delete terminal[missingKey];
  r = classify(ephemeral("TERMINAL", [
    {kind:"worktree", identity:"x", residueState:"ABSENT"},
  ], terminal));
  assert.equal(r.result, "UNKNOWN");
  assert.equal(r.classification, "TERMINAL_EVIDENCE_UNKNOWN");
}

// Stronger explicit asset conflict still outranks missing terminal-state evidence.
r = classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"x", residueState:"CONFLICT"},
], {baselineState:"PRESERVED", foreignResidueState:"NONE"}));
assert.equal(r.result, "CONFLICT");
assert.equal(r.classification, "RESIDUE_EVIDENCE_CONFLICT");

assert.throws(() => classify(ephemeral("TERMINAL", [
  {kind:"worktree", identity:"x", residueState:"ABSENT"},
], {coordinationState:"INVALID", baselineState:"PRESERVED", foreignResidueState:"NONE"})), /invalid coordinationState/);

r = classify(ephemeral("PREFLIGHT", [{kind:"worktree", identity:"x", retirementOwnerReviewed:true}], {evidenceState:"UNKNOWN"}));
assert.equal(r.result, "UNKNOWN");
r = classify(ephemeral("PREFLIGHT", [{kind:"worktree", identity:"x", retirementOwnerReviewed:true}], {evidenceState:"CONFLICT"}));
assert.equal(r.result, "CONFLICT");

r = classify(ephemeral("PREFLIGHT", [{kind:"worktree", identity:"x", retirementOwnerReviewed:true}]));
assert.deepEqual(r.authority, {
  repositoryMutationAuthorized:false,
  deviceMutationAuthorized:false,
  mergeAuthorized:false,
  releaseAuthorized:false,
  productionAuthorized:false,
});

assert.throws(() => classify({schema:"wrong"}), /unsupported schema/);
console.log("ALL SMOKE LIFECYCLE CLOSURE FIXTURES PASS");
