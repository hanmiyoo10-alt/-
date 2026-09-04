#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import sys

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FROM_VERSION = "0.70.5"
TARGET_VERSION = "0.70.6"
RELEASE_NAME = "Manual Edit Redundant Prune Elision"

RELEASE_NOTE = """// v0.70.6 Manual Edit Redundant Prune Elision:
// - Elides the redundant inline retention prune only for a proven USER_EDIT_CANDIDATE same-out-key overwrite
// - Reuses existing prior-representation and savedOut facts; no eligibility read, key scan, timer, queue or scheduler is added
// - Keeps the rebuilt backend.set authoritative and awaited while ordinary deferred Store housekeeping remains retention authority
// - Adds explicit INLINE_PRUNE_SKIPPED / SAME_OUT_KEY_OVERWRITE diagnostic provenance without changing persistent schema
//
"""


def fail(code, detail=""):
    text = code if not detail else f"{code}: {detail}"
    print(text, file=sys.stderr)
    raise SystemExit(1)


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("07006_ANCHOR_COUNT", f"{label}={count}")
    return text.replace(old, new, 1)


def module_names(text):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function', text)


def module_text(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(token)
    if start < 0:
        fail("07006_MODULE_MISSING", name)
    nxt = text.find('\nSimCore.define("', start + len(token))
    if nxt < 0:
        fail("07006_MODULE_END_MISSING", name)
    return text[start:nxt]


def require_lines(text):
    return re.findall(r"^const [^\n=]+ = require\('[^']+'\);$", text, flags=re.M)


def syntax_check(path):
    result = subprocess.run(["node", "--check", str(path)], text=True, capture_output=True)
    if result.returncode != 0:
        fail("07006_NODE_SYNTAX_FAIL", (result.stderr or result.stdout).strip())


def patch(text):
    if not re.search(r'^//@version\s+0\.70\.5\s*$', text, flags=re.M):
        fail("07006_PARENT_VERSION_MISMATCH")

    original_modules = module_names(text)
    original_edit_requires = require_lines(module_text(text, "edit-reconcile"))
    original_store = module_text(text, "store")
    forbidden = [
        "setTimeout(", "setInterval(", "pluginStorage", "setChat(",
        "fetch(", "XMLHttpRequest", "history.splice(", "messages.splice(",
    ]
    forbidden_counts = {marker: text.count(marker) for marker in forbidden}

    text = one(text, "//@version 0.70.5", "//@version 0.70.6", "metadata-version")
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.70.5';", "const SIMCORE_RUNTIME_VERSION = '0.70.6';", "runtime-version")
    text = one(text, "const HOST_COMPAT_VERSION = '0.70.5';", "const HOST_COMPAT_VERSION = '0.70.6';", "host-version")
    text = one(
        text,
        "// v0.70.5 Manual Edit Commit Boundary Attribution:\n",
        RELEASE_NOTE + "// v0.70.5 Manual Edit Commit Boundary Attribution:\n",
        "release-note",
    )
    text = one(
        text,
        "    version: '0.70.5',\n    name: 'Manual Edit Commit Boundary Attribution',",
        "    version: '0.70.6',\n    name: 'Manual Edit Redundant Prune Elision',",
        "operator-card",
    )

    text = one(
        text,
        "async function reconcileSessionEditedOutput(session, outIndex, content, perfDetail = null) {",
        "async function reconcileSessionEditedOutput(session, outIndex, content, perfDetail = null, reconcileOptions = {}) {",
        "reconcile-options-signature",
    )

    text = one(
        text,
        "  async reconcileEditedOutput(outIndex, content, perfDetail = null) {\n    return editReconcile.reconcileSessionEditedOutput(this, outIndex, content, perfDetail);\n  }",
        "  async reconcileEditedOutput(outIndex, content, perfDetail = null, reconcileOptions = {}) {\n    return editReconcile.reconcileSessionEditedOutput(this, outIndex, content, perfDetail, reconcileOptions);\n  }",
        "session-delegate-options",
    )

    text = one(
        text,
        "      reconcileSession: (outIndex, content, detail) => cs.reconcileEditedOutput(outIndex, content, detail),",
        "      reconcileSession: (outIndex, content, detail, reconcileOptions) => cs.reconcileEditedOutput(outIndex, content, detail, reconcileOptions),",
        "outer-delegate-options",
    )

    text = one(
        text,
        "      r = await reconcileSession(lastAssistant, visibleContent, perfDetail);",
        "      const manualEditPruneEligibility = priorRepresentation === 'EXACT' ? 'USER_EDIT_CANDIDATE_WHEN_CHANGED' : 'UNPROVEN';\n      r = await reconcileSession(lastAssistant, visibleContent, perfDetail, { manualEditPruneEligibility });",
        "existing-edit-origin-fact-transport",
    )

    old_save = """    result.state.manualEditRevision = Math.max(0, Number(savedOut.manualEditRevision) || 0) + 1;
    if (detail) detail.stateSyncMs += reconcileElapsed(t);
    const saveMetric = {};
    await session.store.save('out', outIndex, result.state, detail ? { metric: saveMetric } : {});
    if (detail) {"""
    new_save = """    result.state.manualEditRevision = Math.max(0, Number(savedOut.manualEditRevision) || 0) + 1;
    if (detail) detail.stateSyncMs += reconcileElapsed(t);
    const inlinePruneSkipped = reconcileOptions?.manualEditPruneEligibility === 'USER_EDIT_CANDIDATE_WHEN_CHANGED';
    const saveMetric = {};
    const saveOptions = inlinePruneSkipped ? { prune: false } : {};
    if (detail) saveOptions.metric = saveMetric;
    await session.store.save('out', outIndex, result.state, saveOptions);
    if (detail && inlinePruneSkipped) saveMetric.pruneMs = 0;
    if (detail) {"""
    text = one(text, old_save, new_save, "eligible-final-manual-save")

    text = one(
        text,
        "          commitConfidence,\n          otherMs:",
        "          commitConfidence,\n          inlinePruneSkipped,\n          retentionDisposition: inlinePruneSkipped ? 'INLINE_PRUNE_SKIPPED' : null,\n          retentionReason: inlinePruneSkipped ? 'SAME_OUT_KEY_OVERWRITE' : null,\n          otherMs:",
        "manual-retention-attribution",
    )

    text = one(
        text,
        "      editRebuildCommitMs: editNumber(manualEdit?.commitMs), editRebuildCommitConfidence: String(manualEdit?.commitConfidence || 'UNAVAILABLE'), editRebuildOtherMs: editNumber(manualEdit?.otherMs), editRebuildConfidence: String(manualEdit?.confidence || 'UNAVAILABLE'),",
        "      editRebuildCommitMs: editNumber(manualEdit?.commitMs), editRebuildCommitConfidence: String(manualEdit?.commitConfidence || 'UNAVAILABLE'),\n      editRebuildInlinePruneSkipped: manualEdit?.inlinePruneSkipped === true, editRebuildRetentionDisposition: String(manualEdit?.retentionDisposition || 'NONE'), editRebuildRetentionReason: String(manualEdit?.retentionReason || 'NONE'),\n      editRebuildOtherMs: editNumber(manualEdit?.otherMs), editRebuildConfidence: String(manualEdit?.confidence || 'UNAVAILABLE'),",
        "diagnostic-retention-projection",
    )

    existing_commit_line = """      ...(requestBreakdown?.editPath === 'manual-edit-rebuilt' && requestBreakdown.editRebuildConfidence === 'BOUNDED'
        ? [`Manual edit commit: serialize ${requestBreakdown.editRebuildCommitSerializeMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editRebuildCommitSerializeMs)} · set ${requestBreakdown.editRebuildCommitSetMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editRebuildCommitSetMs)} · prune ${requestBreakdown.editRebuildCommitPruneMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editRebuildCommitPruneMs)} · total ${requestBreakdown.editRebuildCommitMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editRebuildCommitMs)} · confidence ${requestBreakdown.editRebuildCommitConfidence}`]
        : []),"""
    retention_line = existing_commit_line + "\n" + """      ...(requestBreakdown?.editPath === 'manual-edit-rebuilt' && requestBreakdown.editRebuildInlinePruneSkipped
        ? [`Manual edit retention: ${requestBreakdown.editRebuildRetentionDisposition} · reason ${requestBreakdown.editRebuildRetentionReason}`]
        : []),"""
    text = one(text, existing_commit_line, retention_line, "manual-retention-diagnostic-line")

    if module_names(text) != original_modules:
        fail("07006_MODULE_INVENTORY_CHANGED")
    if require_lines(module_text(text, "edit-reconcile")) != original_edit_requires:
        fail("07006_EDIT_REQUIRE_GRAPH_CHANGED")
    if module_text(text, "store") != original_store:
        fail("07006_STORE_MODULE_CHANGED")
    for marker, before in forbidden_counts.items():
        if text.count(marker) != before:
            fail("07006_FORBIDDEN_SURFACE_CHANGED", marker)
    return text


def verify(original, candidate):
    checks = [
        (r'^//@version\s+0\.70\.6\s*$', "metadata"),
        (r"const SIMCORE_RUNTIME_VERSION = '0\.70\.6';", "runtime"),
        (r"const HOST_COMPAT_VERSION = '0\.70\.6';", "host"),
        (r"version: '0\.70\.6',\n\s+name: 'Manual Edit Redundant Prune Elision'", "operator-card"),
        (r"manualEditPruneEligibility", "eligibility-transport"),
        (r"prune: false", "prune-elision"),
        (r"INLINE_PRUNE_SKIPPED", "retention-disposition"),
        (r"SAME_OUT_KEY_OVERWRITE", "retention-reason"),
        (r"Manual edit retention:", "diagnostic-line"),
    ]
    for pattern, label in checks:
        if not re.search(pattern, candidate, flags=re.M):
            fail("07006_VERIFY_MISSING", label)
    if candidate.count("Manual edit retention:") != 1:
        fail("07006_DIAGNOSTIC_LINE_COUNT")
    for marker in [
        "MANUAL_EDIT_REBUILT", "REPRESENTATION_FAST_RECONCILED",
        "const PROMPT_COMPILER_VERSION = 4;", "const COMMUNITY_CLASSIFIER_VERSION = 3;",
        "const STATE_VERSION = 5;", "const CORE_STATE_VERSION = 10;",
    ]:
        if original.count(marker) != candidate.count(marker):
            fail("07006_FROZEN_MARKER_CHANGED", marker)
    if original.count("editOrigin = 'USER_EDIT_CANDIDATE'") != candidate.count("editOrigin = 'USER_EDIT_CANDIDATE'"):
        fail("07006_USER_EDIT_DECISION_MARKER_CHANGED")
    if candidate.count("USER_EDIT_CANDIDATE_WHEN_CHANGED") != 2:
        fail("07006_ELIGIBILITY_TOKEN_CARDINALITY")


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail("07006_SOURCE_MISSING", str(path))
        originals.append(path.read_text(encoding="utf-8"))
    if originals[0] != originals[1]:
        fail("07006_PARENT_LATEST_INSTALL_DIVERGED")

    candidates = [patch(text) for text in originals]
    if candidates[0] != candidates[1]:
        fail("07006_CANDIDATE_LATEST_INSTALL_DIVERGED")
    verify(originals[0], candidates[0])

    for path, content in zip(FILES, candidates):
        path.write_text(content, encoding="utf-8")
        syntax_check(path)

    print("07006_BUILD_PASS")


if __name__ == "__main__":
    main()
