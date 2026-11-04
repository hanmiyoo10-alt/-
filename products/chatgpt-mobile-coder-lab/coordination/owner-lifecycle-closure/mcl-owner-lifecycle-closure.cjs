"use strict";

const VALID_EVIDENCE = new Set(["KNOWN", "UNKNOWN", "CONFLICT"]);

function evidenceRefs(o = {}) {
  if (o.evidenceRefs == null) return [];
  if (!Array.isArray(o.evidenceRefs) || o.evidenceRefs.length > 16
      || o.evidenceRefs.some((x) => typeof x !== "string" || !x || x.length > 240)) {
    throw new Error("invalid evidenceRefs");
  }
  return [...o.evidenceRefs];
}

function result(o, value) {
  return { ...value, evidenceRefs: evidenceRefs(o) };
}

function evidenceGate(o = {}) {
  const state = o.evidenceState ?? "KNOWN";
  if (!VALID_EVIDENCE.has(state)) throw new Error("invalid evidenceState: " + state);
  if (state === "UNKNOWN") return result(o, {
    result: "UNKNOWN",
    classification: "CLOSURE_EVIDENCE_UNKNOWN",
    reasonCodes: ["CLOSURE_EVIDENCE_UNKNOWN"],
  });
  if (state === "CONFLICT") return result(o, {
    result: "CONFLICT",
    classification: "CLOSURE_EVIDENCE_CONFLICT",
    reasonCodes: ["CLOSURE_EVIDENCE_CONFLICT"],
  });
  return null;
}

function notApplicable(o = {}) {
  return o.required === false ? result(o, {
    result: "NOT_APPLICABLE",
    classification: "NOT_APPLICABLE",
    reasonCodes: [],
  }) : null;
}

function unknown(o) {
  return result(o, {
    result: "UNKNOWN",
    classification: "CLOSURE_EVIDENCE_UNKNOWN",
    reasonCodes: ["CLOSURE_EVIDENCE_UNKNOWN"],
  });
}

function classifyImplement(o = {}) {
  const gated = evidenceGate(o) || notApplicable(o);
  if (gated) return gated;
  if (o.required !== true) return unknown(o);
  if (o.routeCanImplementExactScope === true) return result(o, {
    result: "PASS", classification: "IMPLEMENT_SELF_COVERED", reasonCodes: [],
  });
  if (o.routeCanImplementExactScope !== false) return unknown(o);
  if (o.bootstrapReviewed === true) return result(o, {
    result: "PASS", classification: "IMPLEMENT_BOOTSTRAP_COVERED", reasonCodes: [],
  });
  if (o.bootstrapReviewed !== false) return unknown(o);
  return result(o, {
    result: "BLOCKED",
    classification: "BOOTSTRAP_REQUIRED",
    reasonCodes: ["IMPLEMENT_BOOTSTRAP_REQUIRED"],
  });
}

function classifyRefine(o = {}) {
  const gated = evidenceGate(o) || notApplicable(o);
  if (gated) return gated;
  if (o.required !== true || typeof o.samePrUpdateRequired !== "boolean") return unknown(o);
  if (o.samePrUpdateRequired === false) return result(o, {
    result: "PASS", classification: "REFINE_SELF_COVERED", reasonCodes: [],
  });
  if (o.samePrUpdateOwnerAvailable === true) return result(o, {
    result: "PASS", classification: "REFINE_SAME_PR_COVERED", reasonCodes: [],
  });
  if (o.samePrUpdateOwnerAvailable !== false
      || typeof o.supersessionOwnerAvailable !== "boolean") return unknown(o);
  if (o.supersessionOwnerAvailable === true) return result(o, {
    result: "BLOCKED",
    classification: "SUPERSESSION_REQUIRED",
    reasonCodes: ["REFINE_SELF_OVERLAP_REQUIRES_SUPERSESSION"],
  });
  return result(o, {
    result: "BLOCKED",
    classification: "SAME_PR_OWNER_MISSING",
    reasonCodes: ["REFINE_SAME_PR_OWNER_MISSING"],
  });
}

function classifyFinalize(o = {}) {
  const gated = evidenceGate(o) || notApplicable(o);
  if (gated) return gated;
  if (o.required !== true) return unknown(o);
  if (o.lateRecognitionOnly === true) return result(o, {
    result: "BLOCKED",
    classification: "LATE_RECOGNITION_ONLY",
    reasonCodes: ["FINALIZE_LATE_RECOGNITION_ONLY"],
  });
  if (o.externalBootstrapRequired === true) return result(o, {
    result: "BLOCKED",
    classification: "EXTERNAL_BOOTSTRAP_REQUIRED",
    reasonCodes: ["FINALIZE_EXTERNAL_BOOTSTRAP_REQUIRED"],
  });
  if (o.stableSelfOwnerExists === false) {
    if (o.recursionDebtDetected === true) return result(o, {
      result: "BLOCKED",
      classification: "NON_DECREASING_SELF_FINALIZATION_DEBT",
      reasonCodes: ["FINALIZE_SELF_OWNER_CLASS_REQUIRED"],
    });
    return result(o, {
      result: "BLOCKED",
      classification: "SELF_OWNER_CLASS_MISSING",
      reasonCodes: ["FINALIZE_SELF_OWNER_CLASS_REQUIRED"],
    });
  }
  if (o.stableSelfOwnerExists !== true
      || typeof o.producerLineageCovered !== "boolean") return unknown(o);
  if (o.producerLineageCovered === true) return result(o, {
    result: "PASS",
    classification: "STABLE_SELF_OWNER_COVERED",
    reasonCodes: [],
  });
  return result(o, {
    result: "BLOCKED",
    classification: "SELF_OWNER_LINEAGE_UNSUPPORTED",
    reasonCodes: ["FINALIZE_SELF_OWNER_LINEAGE_UNSUPPORTED"],
  });
}

function classifyRetire(o = {}) {
  const gated = evidenceGate(o) || notApplicable(o);
  if (gated) return gated;
  if (o.required !== true || !Array.isArray(o.residues)) return unknown(o);
  if (o.residues.some((x) => typeof x?.ownerCovered !== "boolean")) return unknown(o);
  const missing = o.residues.filter((x) => x.ownerCovered === false);
  if (missing.length === 0) return result(o, {
    result: "PASS", classification: "RETIRE_SELF_COVERED", reasonCodes: [],
  });
  return result(o, {
    result: "BLOCKED",
    classification: "OWNER_MISSING",
    reasonCodes: ["RETIRE_ROUTE_STATE_OWNER_MISSING"],
    missingResidues: missing.map((x) => ({
      kind: x.kind ?? "unknown",
      state: x.state ?? "unknown",
    })),
  });
}

function validRecoverRows(rows, field) {
  if (!Array.isArray(rows) || rows.length > 64) return false;
  return rows.every((row) => row && typeof row === "object" && !Array.isArray(row)
    && typeof row.kind === "string" && /^[A-Z0-9_:-]{1,96}$/.test(row.kind)
    && typeof row[field] === "boolean");
}

function uniqueKinds(rows, field) {
  return [...new Set(rows.filter((row) => row[field] === false).map((row) => row.kind))].sort();
}

function classifyRecover(o = {}) {
  const gated = evidenceGate(o) || notApplicable(o);
  if (gated) return gated;
  if (o.required !== true
      || !validRecoverRows(o.naturalStates, "routeCovered")
      || !validRecoverRows(o.continuationPrerequisites, "covered")) return unknown(o);
  const missingStates = uniqueKinds(o.naturalStates, "routeCovered");
  const missingPrerequisites = uniqueKinds(o.continuationPrerequisites, "covered");
  if (missingStates.length || missingPrerequisites.length) {
    const reasonCodes = [];
    if (missingStates.length) reasonCodes.push("RECOVER_ROUTE_MISSING");
    if (missingPrerequisites.length) reasonCodes.push("RECOVER_NEXT_OWNER_PREREQUISITE_MISSING");
    return result(o, {
      result: "BLOCKED",
      classification: missingStates.length
        ? "RECOVER_ROUTE_MISSING"
        : "RECOVER_NEXT_OWNER_PREREQUISITE_MISSING",
      reasonCodes,
      missingStates,
      missingPrerequisites,
    });
  }
  return result(o, {
    result: "PASS",
    classification: "RECOVER_SELF_COVERED",
    reasonCodes: [],
    missingStates: [],
    missingPrerequisites: [],
  });
}

function aggregate(obligations) {
  const values = Object.values(obligations).map((x) => x.result);
  if (values.includes("CONFLICT")) return "CONFLICT";
  if (values.includes("UNKNOWN")) return "UNKNOWN";
  if (values.includes("BLOCKED")) return "BLOCKED";
  return "PASS";
}

function classify(input) {
  const isV1 = input?.schema === "mcl-owner-lifecycle-closure-input.v1";
  const isV2 = input?.schema === "mcl-owner-lifecycle-closure-input.v2";
  if (!isV1 && !isV2) throw new Error("unsupported schema");
  if (!["AUTHORITY_SCOPE", "PRE_MERGE"].includes(input.checkpoint)) {
    throw new Error("unsupported checkpoint");
  }
  const obligations = {
    IMPLEMENT_SELF: classifyImplement(input.obligations?.IMPLEMENT_SELF),
    REFINE_SELF: classifyRefine(input.obligations?.REFINE_SELF),
    FINALIZE_SELF: classifyFinalize(input.obligations?.FINALIZE_SELF),
    RETIRE_SELF: classifyRetire(input.obligations?.RETIRE_SELF),
  };
  if (isV2) obligations.RECOVER_SELF = classifyRecover(input.obligations?.RECOVER_SELF);
  return {
    schema: isV2
      ? "mcl-owner-lifecycle-closure-receipt.v2"
      : "mcl-owner-lifecycle-closure-receipt.v1",
    checkpoint: input.checkpoint,
    result: aggregate(obligations),
    obligations,
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  };
}

module.exports = { classify };
