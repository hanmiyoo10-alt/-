#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import sys

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FROM_VERSION = "0.70.4"
TARGET_VERSION = "0.70.5"
RELEASE_NAME = "Manual Edit Commit Boundary Attribution"

RELEASE_NOTE = """// v0.70.5 Manual Edit Commit Boundary Attribution:
// - Projects existing genuine-manual-edit Store serialize/set/prune metrics into bounded diagnostic metadata
// - Adds one Manual edit commit diagnostic line only on the genuine manual rebuild path
// - Reuses existing Store measurements without changing Store behavior, edit decisions, snapshot semantics or retention policy
// - Adds no persistent schema, raw-body retention, history scan, network, storage or chat operation
//
"""


def fail(code, detail=""):
    text = code if not detail else f"{code}: {detail}"
    print(text, file=sys.stderr)
    raise SystemExit(1)


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("07005_ANCHOR_COUNT", f"{label}={count}")
    return text.replace(old, new, 1)


def module_names(text):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function', text)


def module_text(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(token)
    if start < 0:
        fail("07005_MODULE_MISSING", name)
    nxt = text.find('\nSimCore.define("', start + len(token))
    if nxt < 0:
        fail("07005_MODULE_END_MISSING", name)
    return text[start:nxt]


def require_lines(text):
    return re.findall(r"^const [^\n=]+ = require\('[^']+'\);$", text, flags=re.M)


def syntax_check(path):
    result = subprocess.run(["node", "--check", str(path)], text=True, capture_output=True)
    if result.returncode != 0:
        fail("07005_NODE_SYNTAX_FAIL", (result.stderr or result.stdout).strip())


def patch(text):
    if not re.search(r'^//@version\s+0\.70\.4\s*$', text, flags=re.M):
        fail("07005_PARENT_VERSION_MISMATCH")

    original_modules = module_names(text)
    original_edit_requires = require_lines(module_text(text, "edit-reconcile"))
    original_store = module_text(text, "store")
    forbidden = [
        "setTimeout(", "setInterval(", "pluginStorage", "setChat(",
        "fetch(", "XMLHttpRequest", "history.splice(", "messages.splice(",
    ]
    forbidden_counts = {marker: text.count(marker) for marker in forbidden}

    text = one(text, "//@version 0.70.4", "//@version 0.70.5", "metadata-version")
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.70.4';", "const SIMCORE_RUNTIME_VERSION = '0.70.5';", "runtime-version")
    text = one(text, "const HOST_COMPAT_VERSION = '0.70.4';", "const HOST_COMPAT_VERSION = '0.70.5';", "host-version")
    text = one(
        text,
        "// v0.70.4 Manual Edit Rebuild Attribution:\n",
        RELEASE_NOTE + "// v0.70.4 Manual Edit Rebuild Attribution:\n",
        "release-note",
    )
    text = one(
        text,
        "    version: '0.70.4',\n    name: 'Manual Edit Rebuild Attribution',",
        "    version: '0.70.5',\n    name: 'Manual Edit Commit Boundary Attribution',",
        "operator-card",
    )

    old_commit = """      const commitParts = [saveMetric.serializeMs, saveMetric.setMs, saveMetric.pruneMs];
      const commitKnown = commitParts.every((value) => Number.isFinite(Number(value)) && Number(value) >= 0);
      const commitMs = commitKnown ? commitParts.reduce((sum, value) => sum + Number(value), 0) : null;
      const named = prepareMs + recoveryMs + finalizeMs + (commitMs == null ? 0 : commitMs);"""
    new_commit = """      const commitSerializeMs = Number.isFinite(Number(saveMetric.serializeMs)) && Number(saveMetric.serializeMs) >= 0 ? Number(saveMetric.serializeMs) : null;
      const commitSetMs = Number.isFinite(Number(saveMetric.setMs)) && Number(saveMetric.setMs) >= 0 ? Number(saveMetric.setMs) : null;
      const commitPruneMs = Number.isFinite(Number(saveMetric.pruneMs)) && Number(saveMetric.pruneMs) >= 0 ? Number(saveMetric.pruneMs) : null;
      const commitParts = [commitSerializeMs, commitSetMs, commitPruneMs];
      const commitKnown = commitParts.every((value) => value != null);
      const commitMs = commitKnown ? commitParts.reduce((sum, value) => sum + value, 0) : null;
      const commitConfidence = commitKnown ? 'EXACT' : 'BOUNDED';
      const named = prepareMs + recoveryMs + finalizeMs + (commitMs == null ? 0 : commitMs);"""
    text = one(text, old_commit, new_commit, "commit-components")

    text = one(
        text,
        "          finalizeMs,\n          commitMs,\n          otherMs:",
        "          finalizeMs,\n          commitSerializeMs,\n          commitSetMs,\n          commitPruneMs,\n          commitMs,\n          commitConfidence,\n          otherMs:",
        "attribution-component-fields",
    )

    text = one(
        text,
        "      editRebuildCommitMs: editNumber(manualEdit?.commitMs), editRebuildOtherMs: editNumber(manualEdit?.otherMs), editRebuildConfidence: String(manualEdit?.confidence || 'UNAVAILABLE'),",
        "      editRebuildCommitSerializeMs: editNumber(manualEdit?.commitSerializeMs), editRebuildCommitSetMs: editNumber(manualEdit?.commitSetMs), editRebuildCommitPruneMs: editNumber(manualEdit?.commitPruneMs),\n      editRebuildCommitMs: editNumber(manualEdit?.commitMs), editRebuildCommitConfidence: String(manualEdit?.commitConfidence || 'UNAVAILABLE'), editRebuildOtherMs: editNumber(manualEdit?.otherMs), editRebuildConfidence: String(manualEdit?.confidence || 'UNAVAILABLE'),",
        "diagnostic-component-projection",
    )

    existing_line = """      ...(requestBreakdown?.editPath === 'manual-edit-rebuilt' && requestBreakdown.editRebuildConfidence === 'BOUNDED'
        ? [`Manual edit breakdown: classify ${requestBreakdown.editClassifyMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editClassifyMs)} · prepare ${diagnosticFormatMs(requestBreakdown.editRebuildPrepareMs)} · recovery ${diagnosticFormatMs(requestBreakdown.editRebuildRecoveryMs)} · finalize ${diagnosticFormatMs(requestBreakdown.editRebuildFinalizeMs)} · commit ${requestBreakdown.editRebuildCommitMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editRebuildCommitMs)} · other ${diagnosticFormatMs(requestBreakdown.editRebuildOtherMs)} · confidence ${requestBreakdown.editRebuildConfidence}`]
        : []),"""
    component_line = existing_line + "\n" + """      ...(requestBreakdown?.editPath === 'manual-edit-rebuilt' && requestBreakdown.editRebuildConfidence === 'BOUNDED'
        ? [`Manual edit commit: serialize ${requestBreakdown.editRebuildCommitSerializeMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editRebuildCommitSerializeMs)} · set ${requestBreakdown.editRebuildCommitSetMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editRebuildCommitSetMs)} · prune ${requestBreakdown.editRebuildCommitPruneMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editRebuildCommitPruneMs)} · total ${requestBreakdown.editRebuildCommitMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.editRebuildCommitMs)} · confidence ${requestBreakdown.editRebuildCommitConfidence}`]
        : []),"""
    text = one(text, existing_line, component_line, "manual-commit-diagnostic-line")

    if module_names(text) != original_modules:
        fail("07005_MODULE_INVENTORY_CHANGED")
    if require_lines(module_text(text, "edit-reconcile")) != original_edit_requires:
        fail("07005_EDIT_REQUIRE_GRAPH_CHANGED")
    if module_text(text, "store") != original_store:
        fail("07005_STORE_MODULE_CHANGED")
    for marker, before in forbidden_counts.items():
        if text.count(marker) != before:
            fail("07005_FORBIDDEN_SURFACE_CHANGED", marker)
    return text


def verify(original, candidate):
    checks = [
        (r'^//@version\s+0\.70\.5\s*$', "metadata"),
        (r"const SIMCORE_RUNTIME_VERSION = '0\.70\.5';", "runtime"),
        (r"const HOST_COMPAT_VERSION = '0\.70\.5';", "host"),
        (r"version: '0\.70\.5',\n\s+name: 'Manual Edit Commit Boundary Attribution'", "operator-card"),
        (r"commitSerializeMs", "commit-serialize"),
        (r"commitSetMs", "commit-set"),
        (r"commitPruneMs", "commit-prune"),
        (r"commitConfidence", "commit-confidence"),
        (r"Manual edit commit: serialize", "diagnostic-line"),
    ]
    for pattern, label in checks:
        if not re.search(pattern, candidate, flags=re.M):
            fail("07005_VERIFY_MISSING", label)
    if candidate.count("Manual edit commit: serialize") != 1:
        fail("07005_DIAGNOSTIC_LINE_COUNT")
    for marker in [
        "USER_EDIT_CANDIDATE", "MANUAL_EDIT_REBUILT", "REPRESENTATION_FAST_RECONCILED",
        "const PROMPT_COMPILER_VERSION = 4;", "const COMMUNITY_CLASSIFIER_VERSION = 3;",
        "const STATE_VERSION = 5;", "const CORE_STATE_VERSION = 10;",
    ]:
        if original.count(marker) != candidate.count(marker):
            fail("07005_FROZEN_MARKER_CHANGED", marker)


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail("07005_SOURCE_MISSING", str(path))
        originals.append(path.read_text(encoding="utf-8"))
    if originals[0] != originals[1]:
        fail("07005_PARENT_LATEST_INSTALL_DIVERGED")

    candidates = [patch(text) for text in originals]
    if candidates[0] != candidates[1]:
        fail("07005_CANDIDATE_LATEST_INSTALL_DIVERGED")
    verify(originals[0], candidates[0])

    for path, content in zip(FILES, candidates):
        path.write_text(content, encoding="utf-8")
        syntax_check(path)

    print("07005_BUILD_PASS")


if __name__ == "__main__":
    main()
