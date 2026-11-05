"use strict";
const assert = require("node:assert/strict");
const { classify } = require("../mcl-owner-lifecycle-closure.cjs");

const base = {
  schema: "mcl-owner-lifecycle-closure-input.v1",
  checkpoint: "AUTHORITY_SCOPE",
  obligations: {
    IMPLEMENT_SELF: { required: false },
    REFINE_SELF: { required: false },
    FINALIZE_SELF: { required: false },
    RETIRE_SELF: { required: false }
  }
};

function run(name, patch, check) {
  const input = structuredClone(base);
  for (const [k,v] of Object.entries(patch)) input.obligations[k] = v;
  const receipt = classify(input);
  check(receipt);
  console.log(`PASS ${name}: ${receipt.result}`);
}

run("#2813 historical shape", { IMPLEMENT_SELF: { required:true, routeCanImplementExactScope:false, bootstrapReviewed:false } }, r => {
  assert.equal(r.obligations.IMPLEMENT_SELF.classification, "BOOTSTRAP_REQUIRED");
  assert.equal(r.result, "BLOCKED");
});
run("#3093 historical shape", { IMPLEMENT_SELF: { required:true, routeCanImplementExactScope:false, bootstrapReviewed:false } }, r => {
  assert.equal(r.obligations.IMPLEMENT_SELF.classification, "BOOTSTRAP_REQUIRED");
});
run("#3055 historical shape", { FINALIZE_SELF: { required:true, externalBootstrapRequired:true } }, r => {
  assert.equal(r.obligations.FINALIZE_SELF.classification, "EXTERNAL_BOOTSTRAP_REQUIRED");
});
run("#3143 pre-#3149 shape", { FINALIZE_SELF: { required:true, stableSelfOwnerExists:false, recursionDebtDetected:true } }, r => {
  assert.equal(r.obligations.FINALIZE_SELF.classification, "NON_DECREASING_SELF_FINALIZATION_DEBT");
  assert.deepEqual(r.obligations.FINALIZE_SELF.reasonCodes, ["FINALIZE_SELF_OWNER_CLASS_REQUIRED"]);
});
run("#3149 landed shape", { FINALIZE_SELF: { required:true, stableSelfOwnerExists:true, producerLineageCovered:true } }, r => {
  assert.equal(r.obligations.FINALIZE_SELF.result, "PASS");
});
run("#3178 historical shape", { FINALIZE_SELF: { required:true, lateRecognitionOnly:true } }, r => {
  assert.equal(r.obligations.FINALIZE_SELF.classification, "LATE_RECOGNITION_ONLY");
});
run("#4046 historical shape", { REFINE_SELF: { required:true, samePrUpdateRequired:true, samePrUpdateOwnerAvailable:false, supersessionOwnerAvailable:false } }, r => {
  assert.equal(r.obligations.REFINE_SELF.classification, "SAME_PR_OWNER_MISSING");
});
run("#3856 historical L residue", { RETIRE_SELF: { required:true, residues:[{kind:"worktree", state:"L_PRESENT_CLEAN", ownerCovered:false}] } }, r => {
  assert.equal(r.obligations.RETIRE_SELF.classification, "OWNER_MISSING");
});
run("#4148 pre-#4150 shape", { FINALIZE_SELF: { required:true, stableSelfOwnerExists:true, producerLineageCovered:false } }, r => {
  assert.equal(r.obligations.FINALIZE_SELF.classification, "SELF_OWNER_LINEAGE_UNSUPPORTED");
});
run("post-#4150 reviewed L/L lineage", { FINALIZE_SELF: { required:true, stableSelfOwnerExists:true, producerLineageCovered:true } }, r => {
  assert.equal(r.obligations.FINALIZE_SELF.classification, "STABLE_SELF_OWNER_COVERED");
  assert.equal(r.result, "PASS");
});

const unknown = structuredClone(base);
unknown.obligations.IMPLEMENT_SELF = { required:true, evidenceState:"UNKNOWN" };
assert.equal(classify(unknown).result, "UNKNOWN");

const conflict = structuredClone(base);
conflict.obligations.RETIRE_SELF = { required:true, evidenceState:"CONFLICT" };
assert.equal(classify(conflict).result, "CONFLICT");

const incomplete = structuredClone(base);
incomplete.obligations.FINALIZE_SELF = { required:true };
assert.equal(classify(incomplete).result, "UNKNOWN");
assert.equal(
  classify(incomplete).obligations.FINALIZE_SELF.classification,
  "CLOSURE_EVIDENCE_UNKNOWN",
);

const refs = structuredClone(base);
refs.obligations.IMPLEMENT_SELF = {
  required:true,
  routeCanImplementExactScope:false,
  bootstrapReviewed:false,
  evidenceRefs:["issue:#2813", "source:repository-implementation"],
};
assert.deepEqual(
  classify(refs).obligations.IMPLEMENT_SELF.evidenceRefs,
  ["issue:#2813", "source:repository-implementation"],
);

console.log("ALL PORTABLE V1 FIXTURES PASS");


const v2Base = {
  schema: "mcl-owner-lifecycle-closure-input.v2",
  checkpoint: "AUTHORITY_SCOPE",
  obligations: {
    IMPLEMENT_SELF: { required:false },
    REFINE_SELF: { required:false },
    FINALIZE_SELF: { required:false },
    RETIRE_SELF: { required:false },
    RECOVER_SELF: {
      required:true,
      naturalStates: [],
      continuationPrerequisites: [],
    },
  },
};

function v2Recover(naturalStates, continuationPrerequisites, extra = {}) {
  const input = structuredClone(v2Base);
  input.obligations.RECOVER_SELF = {
    required:true,
    naturalStates,
    continuationPrerequisites,
    ...extra,
  };
  return classify(input);
}

const v1Compatibility = classify(structuredClone(base));
assert.equal(v1Compatibility.schema, "mcl-owner-lifecycle-closure-receipt.v1");
assert.equal(Object.hasOwn(v1Compatibility.obligations, "RECOVER_SELF"), false);

const v2Covered = v2Recover(
  [{kind:"STAGED_ONLY", routeCovered:true}],
  [{kind:"CURRENT_MAIN_OBJECT_AVAILABILITY", covered:true}],
);
assert.equal(v2Covered.schema, "mcl-owner-lifecycle-closure-receipt.v2");
assert.equal(v2Covered.result, "PASS");
assert.equal(v2Covered.obligations.RECOVER_SELF.classification, "RECOVER_SELF_COVERED");

const routeGap = v2Recover(
  [{kind:"STAGE_ENTRY_PARTIAL_CREATE", routeCovered:false}],
  [],
);
assert.equal(routeGap.result, "BLOCKED");
assert.equal(routeGap.obligations.RECOVER_SELF.classification, "RECOVER_ROUTE_MISSING");
assert.deepEqual(routeGap.obligations.RECOVER_SELF.missingStates, ["STAGE_ENTRY_PARTIAL_CREATE"]);

const prerequisiteGap = v2Recover(
  [],
  [{kind:"CURRENT_MAIN_OBJECT_AVAILABILITY", covered:false}],
);
assert.equal(prerequisiteGap.result, "BLOCKED");
assert.equal(
  prerequisiteGap.obligations.RECOVER_SELF.classification,
  "RECOVER_NEXT_OWNER_PREREQUISITE_MISSING",
);
assert.deepEqual(
  prerequisiteGap.obligations.RECOVER_SELF.missingPrerequisites,
  ["CURRENT_MAIN_OBJECT_AVAILABILITY"],
);

const bothGaps = v2Recover(
  [{kind:"POST_EFFECT_PR_PROJECTION_LAG", routeCovered:false}],
  [{kind:"CANONICAL_EVIDENCE_BYTE_TRANSPORT", covered:false}],
);
assert.deepEqual(bothGaps.obligations.RECOVER_SELF.reasonCodes, [
  "RECOVER_ROUTE_MISSING",
  "RECOVER_NEXT_OWNER_PREREQUISITE_MISSING",
]);

const malformedRecover = structuredClone(v2Base);
malformedRecover.obligations.RECOVER_SELF.naturalStates = [{kind:"STAGED_ONLY"}];
assert.equal(classify(malformedRecover).obligations.RECOVER_SELF.result, "UNKNOWN");

const recoverUnknown = structuredClone(v2Base);
recoverUnknown.obligations.RECOVER_SELF.evidenceState = "UNKNOWN";
assert.equal(classify(recoverUnknown).result, "UNKNOWN");
const recoverConflict = structuredClone(v2Base);
recoverConflict.obligations.RECOVER_SELF.evidenceState = "CONFLICT";
assert.equal(classify(recoverConflict).result, "CONFLICT");

const historicalRecoverFixtures = [
  ["#2748 pre-#2750", [{kind:"PREPARED_CONTINUATION",routeCovered:false}], []],
  ["#3246 pre-#3247", [{kind:"STAGED_ONLY",routeCovered:false}], []],
  ["#3334 pre-#4211", [{kind:"STALE_LINKED_WORKTREE_REGISTRATION",routeCovered:false}], []],
  ["#3481 pre-#3561", [{kind:"UNSTAGED_ONLY",routeCovered:false}], []],
  ["#4111 pre-current recovery", [{kind:"EXISTING_PR_STAGED_DELTA",routeCovered:false}], []],
  ["#4162 pre-#4209", [{kind:"POST_EFFECT_PR_PROJECTION_LAG",routeCovered:false}], []],
  ["#4208 pre-#4211", [{kind:"STAGE_ENTRY_PARTIAL_CREATE",routeCovered:false}], []],
];
for (const [name, states, prerequisites] of historicalRecoverFixtures) {
  const receipt = v2Recover(states, prerequisites);
  assert.equal(receipt.result, "BLOCKED", name);
  assert.equal(receipt.obligations.RECOVER_SELF.classification, "RECOVER_ROUTE_MISSING", name);
}

const prerequisiteFixtures = [
  "CURRENT_MAIN_OBJECT_AVAILABILITY",
  "LOST_ACK_RECONVERGENCE",
  "OWNER_EFFECT_REACHABILITY",
  "PACKET_ACTIVITY_EVIDENCE_CONSUMPTION",
  "COORDINATION_ENVELOPE_CAPACITY",
  "EPHEMERAL_CAPABILITY_COMPOSITION",
  "PRODUCER_CONSUMER_LINEAGE_COMPATIBILITY",
  "EXECUTION_PROFILE_COMPATIBILITY",
  "MODE_PROFILE_ADMISSION",
  "CANONICAL_EVIDENCE_BYTE_TRANSPORT",
  "POSTMERGE_FINALIZATION_REACHABILITY",
];
for (const kind of prerequisiteFixtures) {
  const receipt = v2Recover([], [{kind,covered:false}]);
  assert.equal(receipt.result, "BLOCKED", kind);
  assert.equal(
    receipt.obligations.RECOVER_SELF.classification,
    "RECOVER_NEXT_OWNER_PREREQUISITE_MISSING",
    kind,
  );
}

const post4216Finalization = v2Recover(
  [],
  [{kind:"POSTMERGE_FINALIZATION_REACHABILITY",covered:true}],
);
assert.equal(post4216Finalization.result, "PASS");

console.log("ALL PORTABLE V2 RECOVER_SELF FIXTURES PASS");
