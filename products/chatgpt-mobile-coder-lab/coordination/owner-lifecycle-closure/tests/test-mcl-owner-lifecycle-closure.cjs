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
