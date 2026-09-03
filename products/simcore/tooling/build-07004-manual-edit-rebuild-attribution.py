#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import sys

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FROM_VERSION = "0.70.3"
TARGET_VERSION = "0.70.4"
RELEASE_NAME = "Manual Edit Rebuild Attribution"

RELEASE_NOTE = """// v0.70.4 Manual Edit Rebuild Attribution:
// - Adds bounded current-request timing decomposition only for genuine MANUAL_EDIT_REBUILT reconciliation
// - Attributes classify, prepare, recovery, finalize, commit and conservative residual other without changing edit decisions or snapshot semantics
// - Renders one Manual edit breakdown diagnostic line only for the genuine manual rebuild path; fast/carryover paths remain branch-only
// - Adds no require edge, persistent schema, raw-body retention, history scan, timer, network, storage or chat operation beyond the already-required rebuild work
//
"""


def fail(code, detail=""):
    text = code if not detail else f"{code}: {detail}"
    print(text, file=sys.stderr)
    raise SystemExit(1)


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("07004_ANCHOR_COUNT", f"{label}={count}")
    return text.replace(old, new, 1)


def module_names(text):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function', text)


def module_text(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(token)
    if start < 0:
        fail("07004_MODULE_MISSING", name)
    nxt = text.find('\nSimCore.define("', start + len(token))
    if nxt < 0:
        fail("07004_MODULE_END_MISSING", name)
    return text[start:nxt]


def require_lines(text):
    return re.findall(r"^const [^\n=]+ = require\('[^']+'\);$", text, flags=re.M)


def syntax_check(path):
    result = subprocess.run(["node", "--check", str(path)], text=True, capture_output=True)
    if result.returncode != 0:
        fail("07004_NODE_SYNTAX_FAIL", (result.stderr or result.stdout).strip())


def patch(text):
    if not re.search(r'^//@version\s+0\.70\.3\s*$', text, flags=re.M):
        fail("07004_PARENT_VERSION_MISMATCH")

    original_modules = module_names(text)
    original_edit_requires = require_lines(module_text(text, "edit-reconcile"))
    forbidden = [
        "await ", "setTimeout(", "setInterval(", "pluginStorage", "setChat(",
        "fetch(", "XMLHttpRequest", "history.splice(", "messages.splice(",
    ]
    forbidden_counts = {marker: text.count(marker) for marker in forbidden}

    text = one(text, "//@version 0.70.3", "//@version 0.70.4", "metadata-version")
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.70.3';", "const SIMCORE_RUNTIME_VERSION = '0.70.4';", "runtime-version")
    text = one(text, "const HOST_COMPAT_VERSION = '0.70.3';", "const HOST_COMPAT_VERSION = '0.70.4';", "host-version")
    text = one(
        text,
        "// v0.70.3 Post-M2 Simplification Convergence:\n",
        RELEASE_NOTE + "// v0.70.3 Post-M2 Simplification Convergence:\n",
        "release-note",
    )
    text = one(
        text,
        "    version: '0.70.3',\n    name: 'Post-M2 Simplification Convergence',",
        "    version: '0.70.4',\n    name: 'Manual Edit Rebuild Attribution',",
        "operator-card",
    )

    text = one(
        text,
        "async function reconcileSessionEditedOutput(session, outIndex, content, perfDetail = null) {\n\n    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;\n    if (detail) {",
        "async function reconcileSessionEditedOutput(session, outIndex, content, perfDetail = null) {\n\n    const detail = perfDetail && typeof perfDetail === 'object' ? perfDetail : null;\n    const inheritedRebuildStart = detail && Number.isFinite(Number(detail.editRebuildStart))\n      ? Number(detail.editRebuildStart)\n      : null;\n    if (detail) {",
        "edit-detail-head",
    )
    text = one(
        text,
        "      detail.outPruneMs = 0;\n      detail.didSave = false;",
        "      detail.outPruneMs = 0;\n      detail.didSave = false;\n      detail.editClassifyMs = Number.isFinite(Number(detail.editClassifyMs)) ? Number(detail.editClassifyMs) : null;\n      detail.manualEditAttribution = null;",
        "edit-detail-fields",
    )
    text = one(
        text,
        "    let t = reconcileNow();\n    const actualFingerprint = kernel.fingerprintText(content);",
        "    let t = reconcileNow();\n    const rebuildAttributionStart = inheritedRebuildStart == null ? t : inheritedRebuildStart;\n    const actualFingerprint = kernel.fingerprintText(content);",
        "rebuild-start",
    )
    text = one(
        text,
        "    } else {\n      r = await reconcileSession(lastAssistant, visibleContent, perfDetail);\n    }",
        "    } else {\n      if (perfDetail && Number.isFinite(Number(perfDetail.editReconcileStart))) {\n        const classifyEnd = reconcileNow();\n        perfDetail.editClassifyMs = Math.max(0, classifyEnd - Number(perfDetail.editReconcileStart));\n        perfDetail.editRebuildStart = classifyEnd;\n      }\n      r = await reconcileSession(lastAssistant, visibleContent, perfDetail);\n    }",
        "classify-boundary",
    )
    text = one(
        text,
        "    t = perfNow();\n    const editDetail = perf ? {} : null;\n    await reconcileManualEdit(cs, chat, editDetail);",
        "    t = perfNow();\n    const editDetail = perf ? { editReconcileStart: t } : null;\n    await reconcileManualEdit(cs, chat, editDetail);",
        "outer-edit-start",
    )

    manual_tail_old = """    session.current = result.state;
    session.currentOutputIndex = outIndex;
    session.trustedOutputFingerprint = result.state.outputFingerprint || null;
    session.trustedHostOutputFingerprint = actualFingerprint;
    session.loadedFromLegacySnapshot = false;
    return { changed: true, mode: result.mode || result.state.lastMode, revision: result.state.manualEditRevision };"""
    manual_tail_new = """    session.current = result.state;
    session.currentOutputIndex = outIndex;
    session.trustedOutputFingerprint = result.state.outputFingerprint || null;
    session.trustedHostOutputFingerprint = actualFingerprint;
    session.loadedFromLegacySnapshot = false;
    if (detail) {
      const rebuildTotalMs = reconcileElapsed(rebuildAttributionStart);
      const prepareMs = Number(detail.prepareMs);
      const recoveryMs = Number(detail.clockRepairMs);
      const finalizeMs = Number(detail.finalizeMs);
      const commitParts = [saveMetric.serializeMs, saveMetric.setMs, saveMetric.pruneMs];
      const commitKnown = commitParts.every((value) => Number.isFinite(Number(value)) && Number(value) >= 0);
      const commitMs = commitKnown ? commitParts.reduce((sum, value) => sum + Number(value), 0) : null;
      const named = commitMs == null ? null : prepareMs + recoveryMs + finalizeMs + commitMs;
      const closureValid = Number.isFinite(rebuildTotalMs) && rebuildTotalMs >= 0
        && Number.isFinite(prepareMs) && prepareMs >= 0
        && Number.isFinite(recoveryMs) && recoveryMs >= 0
        && Number.isFinite(finalizeMs) && finalizeMs >= 0
        && commitMs != null && Number.isFinite(named) && named >= 0
        && named <= rebuildTotalMs + 0.5;
      if (closureValid) {
        detail.manualEditAttribution = Object.freeze({
          classifyMs: Number.isFinite(Number(detail.editClassifyMs)) && Number(detail.editClassifyMs) >= 0 ? Number(detail.editClassifyMs) : null,
          rebuildTotalMs,
          prepareMs,
          recoveryMs,
          finalizeMs,
          commitMs,
          otherMs: Math.max(0, rebuildTotalMs - named),
          confidence: 'BOUNDED',
        });
      }
    }
    return { changed: true, mode: result.mode || result.state.lastMode, revision: result.state.manualEditRevision };"""
    text = one(text, manual_tail_old, manual_tail_new, "manual-attribution-tail")

    text = one(
        text,
        "    const tail = perf.postOnSendAttribution || {};\n    const tailNumber = (value) => value == null || !Number.isFinite(Number(value)) || Number(value) < 0 ? null : Number(value);",
        "    const tail = perf.postOnSendAttribution || {};\n    const manualEdit = edit.manualEditAttribution && typeof edit.manualEditAttribution === 'object' ? edit.manualEditAttribution : null;\n    const tailNumber = (value) => value == null || !Number.isFinite(Number(value)) || Number(value) < 0 ? null : Number(value);\n    const editNumber = (value) => value == null || !Number.isFinite(Number(value)) || Number(value) < 0 ? null : Number(value);",
        "diagnostic-manual-source",
    )
    text = one(
        text,
        "      editDeltaCanonical: edit.editDeltaCanonical == null ? null : Number(edit.editDeltaCanonical), editDeltaFresh: edit.editDeltaFresh == null ? null : Number(edit.editDeltaFresh), editDeltaShape: String(edit.editDeltaShape || 'UNCLASSIFIED'),\n    };",
        "      editDeltaCanonical: edit.editDeltaCanonical == null ? null : Number(edit.editDeltaCanonical), editDeltaFresh: edit.editDeltaFresh == null ? null : Number(edit.editDeltaFresh), editDeltaShape: String(edit.editDeltaShape || 'UNCLASSIFIED'),\n      editClassifyMs: editNumber(manualEdit?.classifyMs), editRebuildTotalMs: editNumber(manualEdit?.rebuildTotalMs),\n      editRebuildPrepareMs: editNumber(manualEdit?.prepareMs), editRebuildRecoveryMs: editNumber(manualEdit?.recoveryMs), editRebuildFinalizeMs: editNumber(manualEdit?.finalizeMs),\n      editRebuildCommitMs: editNumber(manualEdit?.commitMs), editRebuildOtherMs: editNumber(manualEdit?.otherMs), editRebuildConfidence: String(manualEdit?.confidence || 'UNAVAILABLE'),\n    };",
        "diagnostic-manual-fields",
    )
    diagnostic_anchor = "      `Edit reconcile: ${requestBreakdown ? `${editPathLabel} · ${diagnosticFormatMs(requestBreakdown.editReconcileMs)} · snapshot ${requestBreakdown.editDidSave ? 'UPDATED' : 'UNCHANGED'} · representation ${requestBreakdown.editCompatibilitySource || 'n/a'}` : 'n/a'}`,"
    diagnostic_insert = diagnostic_anchor + "\n" + """      ...(requestBreakdown?.editPath === 'manual-edit-rebuilt' && requestBreakdown.editRebuildConfidence === 'BOUNDED'
        ? [`Manual edit breakdown: classify ${requestBreakdown.editClassifyMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editClassifyMs)} · prepare ${diagnosticFormatMs(requestBreakdown.editRebuildPrepareMs)} · recovery ${diagnosticFormatMs(requestBreakdown.editRebuildRecoveryMs)} · finalize ${diagnosticFormatMs(requestBreakdown.editRebuildFinalizeMs)} · commit ${requestBreakdown.editRebuildCommitMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editRebuildCommitMs)} · other ${diagnosticFormatMs(requestBreakdown.editRebuildOtherMs)} · confidence ${requestBreakdown.editRebuildConfidence}`]
        : []),"""
    text = one(text, diagnostic_anchor, diagnostic_insert, "manual-diagnostic-line")

    if module_names(text) != original_modules:
        fail("07004_MODULE_INVENTORY_CHANGED")
    if require_lines(module_text(text, "edit-reconcile")) != original_edit_requires:
        fail("07004_EDIT_REQUIRE_GRAPH_CHANGED")
    for marker, before in forbidden_counts.items():
        if text.count(marker) != before:
            fail("07004_FORBIDDEN_SURFACE_CHANGED", marker)
    return text


def verify(original, candidate):
    checks = [
        (r'^//@version\s+0\.70\.4\s*$', "metadata"),
        (r"const SIMCORE_RUNTIME_VERSION = '0\.70\.4';", "runtime"),
        (r"const HOST_COMPAT_VERSION = '0\.70\.4';", "host"),
        (r"version: '0\.70\.4',\n\s+name: 'Manual Edit Rebuild Attribution'", "operator-card"),
        (r"detail\.manualEditAttribution = Object\.freeze", "manual-attribution"),
        (r"Manual edit breakdown: classify", "diagnostic-line"),
        (r"editReconcileStart: t", "classify-start"),
        (r"confidence: 'BOUNDED'", "bounded-confidence"),
    ]
    for pattern, label in checks:
        if not re.search(pattern, candidate, flags=re.M):
            fail("07004_VERIFY_MISSING", label)
    for marker in [
        "USER_EDIT_CANDIDATE", "MANUAL_EDIT_REBUILT", "REPRESENTATION_FAST_RECONCILED",
        "const PROMPT_COMPILER_VERSION = 4;", "const COMMUNITY_CLASSIFIER_VERSION = 3;",
        "const STATE_VERSION = 5;", "const CORE_STATE_VERSION = 10;",
    ]:
        if original.count(marker) != candidate.count(marker):
            fail("07004_FROZEN_MARKER_CHANGED", marker)


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail("07004_SOURCE_MISSING", str(path))
        originals.append(path.read_text(encoding="utf-8"))
    if originals[0] != originals[1]:
        fail("07004_PARENT_LATEST_INSTALL_DIVERGED")

    candidates = [patch(text) for text in originals]
    if candidates[0] != candidates[1]:
        fail("07004_CANDIDATE_LATEST_INSTALL_DIVERGED")
    verify(originals[0], candidates[0])

    for path, content in zip(FILES, candidates):
        path.write_text(content, encoding="utf-8")
        syntax_check(path)

    print("07004_BUILD_PASS")


if __name__ == "__main__":
    main()
