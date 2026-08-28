#!/usr/bin/env python3
from pathlib import Path
import hashlib
import re
import subprocess

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FAILED_CANDIDATE = "ea88eecb4428a42682894c96980bef420b0a0d27"
FAILED_CANDIDATE_REF = "refs/heads/candidate/simcore/simcore-v0.66.0-intent-02"
EXPECTED_PARENT = "c6659296c68b4322d0ed43f7d8a3339e57f1cbf1"
EXPECTED_GIT_BLOB = "766c3b758ca26ae72546a38bfa1c053efa666c45"
EXPECTED_RAW_SHA256 = "af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a"
EXPECTED_RAW_BYTES = 563052

SESSION_SMOKE = r'''
const fs = require('fs');
const sourcePath = process.argv[1];
const text = fs.readFileSync(sourcePath, 'utf8');
const marker = 'SimCore.define("session", function (require, module, exports) {';
const start = text.indexOf(marker);
if (start < 0) throw new Error('06600_FIX03_SMOKE_SESSION_MISSING');
const next = text.indexOf('\nSimCore.define("', start + marker.length);
if (next < 0) throw new Error('06600_FIX03_SMOKE_SESSION_END_MISSING');
const slice = text.slice(start, next);
let factory = null;
const SimCore = {
  define(name, fn) {
    if (name === 'session') factory = fn;
  },
};
new Function('SimCore', slice)(SimCore);
if (typeof factory !== 'function') throw new Error('06600_FIX03_SMOKE_FACTORY_MISSING');
let stub;
stub = new Proxy(function () { return stub; }, {
  get(_target, key) {
    if (key === Symbol.toPrimitive) return () => 0;
    if (key === 'then') return undefined;
    return stub;
  },
  apply() { return stub; },
  construct() { return {}; },
});
const module = { exports: {} };
factory(() => stub, module, module.exports);
if (module.exports == null || !['object', 'function'].includes(typeof module.exports)) {
  throw new Error('06600_FIX03_SMOKE_EXPORT_INVALID');
}
if (Object.prototype.hasOwnProperty.call(module.exports, 'recovery')) {
  throw new Error('06600_FIX03_SMOKE_STALE_RECOVERY_EXPORT');
}
process.stdout.write('SIMCORE_06600_FIX03_SESSION_SMOKE_PASS\n');
'''


def fail(code, detail=""):
    suffix = f" {detail}" if detail else ""
    raise SystemExit(f"{code}{suffix}")


def run(args, *, text=True, check=True):
    result = subprocess.run(
        args,
        cwd=Path.cwd(),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=text,
    )
    if check and result.returncode != 0:
        stderr = result.stderr if text else result.stderr.decode("utf-8", "replace")
        stdout = result.stdout if text else result.stdout.decode("utf-8", "replace")
        fail("06600_FIX03_COMMAND_FAILED", f"cmd={' '.join(args)} stderr={stderr.strip()} stdout={stdout.strip()}")
    return result


def git_text(*args):
    return run(["git", *args], text=True).stdout.strip()


def ensure_failed_candidate_object():
    probe = run(["git", "cat-file", "-e", f"{FAILED_CANDIDATE}^{{commit}}"], check=False)
    if probe.returncode == 0:
        return

    fetched = run(["git", "fetch", "--no-tags", "origin", FAILED_CANDIDATE_REF], check=False)
    if fetched.returncode != 0:
        fail("06600_FIX03_FAILED_CANDIDATE_FETCH_FAILED", fetched.stderr.strip())
    observed = git_text("rev-parse", "FETCH_HEAD")
    if observed != FAILED_CANDIDATE:
        fail("06600_FIX03_FAILED_CANDIDATE_REF_MOVED", f"observed={observed}")
    run(["git", "cat-file", "-e", f"{FAILED_CANDIDATE}^{{commit}}"])


def failed_candidate_bytes(path):
    result = run(["git", "show", f"{FAILED_CANDIDATE}:{path.as_posix()}"], text=False)
    return bytes(result.stdout)


def verify_failed_candidate_identity():
    parents = git_text("rev-list", "--parents", "-n", "1", FAILED_CANDIDATE).split()
    if parents != [FAILED_CANDIDATE, EXPECTED_PARENT]:
        fail("06600_FIX03_FAILED_CANDIDATE_PARENT_INVALID", " ".join(parents))

    blobs = [git_text("rev-parse", f"{FAILED_CANDIDATE}:{path.as_posix()}") for path in FILES]
    if blobs != [EXPECTED_GIT_BLOB, EXPECTED_GIT_BLOB]:
        fail("06600_FIX03_FAILED_CANDIDATE_BLOB_INVALID", repr(blobs))

    latest = failed_candidate_bytes(FILES[0])
    install = failed_candidate_bytes(FILES[1])
    if latest != install:
        fail("06600_FIX03_FAILED_CANDIDATE_LATEST_INSTALL_DIVERGED")
    if len(latest) != EXPECTED_RAW_BYTES:
        fail("06600_FIX03_FAILED_CANDIDATE_BYTES_INVALID", f"observed={len(latest)}")
    digest = hashlib.sha256(latest).hexdigest()
    if digest != EXPECTED_RAW_SHA256:
        fail("06600_FIX03_FAILED_CANDIDATE_SHA256_INVALID", f"observed={digest}")
    return latest


def module_bounds(text, name):
    start_token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(start_token)
    if start < 0:
        fail("06600_FIX03_MODULE_MISSING", name)
    next_start = text.find('\nSimCore.define("', start + len(start_token))
    if next_start < 0:
        fail("06600_FIX03_MODULE_END_MISSING", name)
    return start, next_start


def repair_session_export(raw_bytes):
    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        fail("06600_FIX03_RUNTIME_UTF8_INVALID", str(exc))

    session_start, session_end = module_bounds(text, "session")
    session = text[session_start:session_end]

    if "require('./recovery')" in session or 'require("./recovery")' in session:
        fail("06600_FIX03_SESSION_RECOVERY_REQUIRE_PRESENT")
    if "recovery." in session:
        fail("06600_FIX03_SESSION_RECOVERY_CALL_PRESENT")

    export_start = session.rfind("module.exports = {")
    if export_start < 0:
        fail("06600_FIX03_SESSION_EXPORT_MISSING")
    export_tail = session[export_start:]
    stale_lines = re.findall(r"(?m)^[ \t]+recovery,\r?$", export_tail)
    if len(stale_lines) != 1:
        fail("06600_FIX03_STALE_RECOVERY_EXPORT_COUNT_INVALID", f"count={len(stale_lines)}")

    repaired_tail, count = re.subn(r"(?m)^[ \t]+recovery,\r?\n", "", export_tail, count=1)
    if count != 1:
        fail("06600_FIX03_STALE_RECOVERY_EXPORT_REMOVE_FAILED")
    repaired_session = session[:export_start] + repaired_tail
    if re.search(r"(?m)^[ \t]+recovery,\r?$", repaired_session):
        fail("06600_FIX03_STALE_RECOVERY_EXPORT_REMAINS")

    repaired = text[:session_start] + repaired_session + text[session_end:]

    recovery_start, recovery_end = module_bounds(repaired, "recovery")
    recovery_module = repaired[recovery_start:recovery_end]
    if "module.exports = {" not in recovery_module:
        fail("06600_FIX03_RECOVERY_FACADE_EXPORT_MISSING")
    if "outputCompat" not in recovery_module or "bootstrapMigration" not in recovery_module:
        fail("06600_FIX03_RECOVERY_FACADE_SHAPE_INVALID")

    if repaired.count('SimCore.define("session", function (require, module, exports) {') != 1:
        fail("06600_FIX03_SESSION_MODULE_COUNT_INVALID")
    if repaired.count('SimCore.define("recovery", function (require, module, exports) {') != 1:
        fail("06600_FIX03_RECOVERY_MODULE_COUNT_INVALID")
    if "//@version 0.66.0" not in repaired:
        fail("06600_FIX03_VERSION_INVALID")

    return repaired.encode("utf-8")


def validate_generated_runtime():
    latest = FILES[0].read_bytes()
    install = FILES[1].read_bytes()
    if latest != install:
        fail("06600_FIX03_LATEST_INSTALL_DIVERGED")

    for path in FILES:
        syntax = run(["node", "--check", path.as_posix()], check=False)
        if syntax.returncode != 0:
            fail("06600_FIX03_NODE_SYNTAX_FAIL", f"path={path} stderr={syntax.stderr.strip()}")

        smoke = run(["node", "-e", SESSION_SMOKE, path.as_posix()], check=False)
        if smoke.returncode != 0:
            fail(
                "06600_FIX03_SESSION_SMOKE_FAIL",
                f"path={path} stderr={smoke.stderr.strip()} stdout={smoke.stdout.strip()}",
            )
        if "SIMCORE_06600_FIX03_SESSION_SMOKE_PASS" not in smoke.stdout:
            fail("06600_FIX03_SESSION_SMOKE_RECEIPT_MISSING", path.as_posix())


def main():
    for path in FILES:
        if not path.is_file():
            fail("06600_FIX03_PRODUCTION_RUNTIME_MISSING", path.as_posix())

    ensure_failed_candidate_object()
    frozen = verify_failed_candidate_identity()
    repaired = repair_session_export(frozen)

    delta = len(frozen) - len(repaired)
    if delta <= 0 or delta > 32:
        fail("06600_FIX03_MUTATION_BUDGET_INVALID", f"byte_delta={delta}")

    for path in FILES:
        path.write_bytes(repaired)

    validate_generated_runtime()
    digest = hashlib.sha256(repaired).hexdigest()
    print(
        "SIMCORE_06600_FIX03_PASS "
        f"source_candidate={FAILED_CANDIDATE} byte_delta=-{delta} "
        f"output_bytes={len(repaired)} output_sha256={digest}"
    )


if __name__ == "__main__":
    main()
