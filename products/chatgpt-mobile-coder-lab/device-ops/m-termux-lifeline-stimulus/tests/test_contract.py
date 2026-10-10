import contextlib
import importlib.util
import io
import os
from pathlib import Path
import signal
import sys
import tempfile
import unittest
from unittest import mock

OWNER = Path(__file__).resolve().parents[1]
MODULE_PATH = OWNER / "mcl-m-termux-lifeline-stimulus.py"

spec = importlib.util.spec_from_file_location("mcl_termux_lifeline_stimulus", MODULE_PATH)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)


class Result:
    def __init__(self, stdout="", stderr="", returncode=0):
        self.stdout = stdout
        self.stderr = stderr
        self.returncode = returncode


def write_proc(root: Path, pid: int, ppid: int, argv0: str):
    proc = root / str(pid)
    proc.mkdir()
    (proc / "stat").write_text(f"{pid} ({argv0}) S {ppid} 0 0 0\n")
    (proc / "cmdline").write_bytes(argv0.encode() + b"\0")


class StimulusContractTests(unittest.TestCase):
    def package_runner(self, uid):
        text = "".join(
            f"package:{name} uid:{uid}\n"
            for name in sorted(mod.EXPECTED_PACKAGES)
        )
        return Result(stdout=text, stderr="withheld diagnostic")

    def plan(self):
        entries = (
            mod.ProcessEntry(10, 1, "com.termux.api"),
            mod.ProcessEntry(11, 10, "/system/bin/app_process"),
            mod.ProcessEntry(20, 1, "com.termux.boot"),
            mod.ProcessEntry(21, 20, "/system/bin/sh"),
            mod.ProcessEntry(30, 1, "com.termux"),
            mod.ProcessEntry(31, 30, "/data/data/com.termux/files/usr/bin/bash"),
            mod.ProcessEntry(32, 31, "/data/data/com.termux/files/usr/bin/python"),
        )
        return mod.classify_process_domain(entries, self_pid=32)

    def test_package_query_is_fixed_and_exact(self):
        calls = []

        def runner(uid):
            calls.append(uid)
            return self.package_runner(uid)

        names = mod.query_package_family(10496, runner=runner)
        self.assertEqual(names, mod.EXPECTED_PACKAGES)
        self.assertEqual(calls, [10496])
        source = MODULE_PATH.read_text()
        self.assertIn('"list", "packages", "-U", "--uid", str(uid)', source)
        self.assertIn("shell=False", source)
        self.assertNotIn("shell=True", source)

    def test_package_family_extra_or_wrong_uid_fails_closed(self):
        uid = 10496
        extra = Result(stdout=(
            f"package:com.termux uid:{uid}\n"
            f"package:com.termux.api uid:{uid}\n"
            f"package:com.termux.boot uid:{uid}\n"
            f"package:other uid:{uid}\n"
        ))
        with self.assertRaises(mod.StimulusBlocked):
            mod.query_package_family(uid, runner=lambda _uid: extra)

        wrong = Result(stdout=(
            f"package:com.termux uid:{uid}\n"
            f"package:com.termux.api uid:{uid}\n"
            f"package:com.termux.boot uid:{uid + 1}\n"
        ))
        with self.assertRaises(mod.StimulusBlocked):
            mod.query_package_family(uid, runner=lambda _uid: wrong)

    def test_package_query_nonzero_or_malformed_is_unknown(self):
        with self.assertRaises(mod.StimulusUnknown):
            mod.query_package_family(1, runner=lambda _uid: Result(returncode=1))
        with self.assertRaises(mod.StimulusUnknown):
            mod.query_package_family(1, runner=lambda _uid: Result(stdout="garbage\n"))

    def test_proc_snapshot_requires_readable_same_uid_identity(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            write_proc(root, 100, 1, "com.termux")
            entries = mod.scan_uid_processes(root, os.getuid())
            self.assertEqual(entries, (mod.ProcessEntry(100, 1, "com.termux"),))

            broken = root / "101"
            broken.mkdir()
            (broken / "stat").write_text("101 (broken) S 1 0 0\n")
            with self.assertRaises(mod.StimulusUnknown):
                mod.scan_uid_processes(root, os.getuid())

    def test_api_and_boot_roots_and_descendants_are_preserved(self):
        plan = self.plan()
        self.assertEqual(plan.preserved, frozenset({10, 11, 20, 21}))
        self.assertEqual(plan.targets, frozenset({30, 31, 32}))
        self.assertEqual(plan.self_pid, 32)

    def test_self_must_be_in_target_domain(self):
        entries = (
            mod.ProcessEntry(10, 1, "com.termux.api"),
            mod.ProcessEntry(11, 10, "/system/bin/app_process"),
        )
        with self.assertRaises(mod.StimulusBlocked):
            mod.classify_process_domain(entries, self_pid=11)
        with self.assertRaises(mod.StimulusUnknown):
            mod.classify_process_domain(entries, self_pid=999)

    def test_build_plan_composes_package_and_proc_evidence(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            write_proc(root, 30, 1, "com.termux")
            write_proc(root, 31, 30, "/data/data/com.termux/files/usr/bin/python")
            plan = mod.build_plan(
                uid_getter=os.getuid,
                pid_getter=lambda: 31,
                proc_root=root,
                package_runner=self.package_runner,
            )
            self.assertEqual(plan.targets, frozenset({30, 31}))

    def test_check_is_read_only_and_receipt_is_redacted(self):
        out = mod.check_receipt(plan_builder=self.plan)
        self.assertEqual(out["result"], "pass")
        rendered = mod.render_receipt(out)
        self.assertIn("effect=none", rendered)
        self.assertNotIn("32", rendered)
        self.assertNotIn("com.termux", rendered)
        self.assertNotIn("/data/", rendered)

    def test_fire_requires_exact_rdc_route_before_any_signal(self):
        calls = []
        out = io.StringIO()
        rc = mod.fire(
            environ={},
            plan_builder=self.plan,
            kill_fn=lambda pid, sig: calls.append((pid, sig)),
            out=out,
        )
        self.assertEqual(rc, 3)
        self.assertEqual(calls, [])
        self.assertIn("route=blocked", out.getvalue())

    def test_fire_preflights_signal_zero_then_signals_targets_once_self_last(self):
        calls = []
        out = io.StringIO()
        rc = mod.fire(
            environ={mod.ROUTE_ENV: mod.ROUTE_VALUE},
            plan_builder=self.plan,
            kill_fn=lambda pid, sig: calls.append((pid, sig)),
            out=out,
        )
        self.assertEqual(rc, 5)
        plan = self.plan()
        expected_zero = [(pid, 0) for pid in sorted(plan.targets)]
        expected_term = [
            (pid, signal.SIGTERM)
            for pid in sorted(plan.targets - {plan.self_pid})
        ] + [(plan.self_pid, signal.SIGTERM)]
        self.assertEqual(calls, expected_zero + expected_term)
        self.assertTrue(all(pid not in plan.preserved for pid, _ in calls))
        text = out.getvalue()
        self.assertIn("result=external_proof_required", text)
        self.assertNotIn("result=pass", text)

    def test_fire_process_lookup_during_effect_does_not_retry_or_escalate(self):
        calls = []
        plan = self.plan()

        def kill_fn(pid, sig):
            calls.append((pid, sig))
            if sig == signal.SIGTERM and pid == 30:
                raise ProcessLookupError()

        rc = mod.fire(
            environ={mod.ROUTE_ENV: mod.ROUTE_VALUE},
            plan_builder=lambda: plan,
            kill_fn=kill_fn,
            out=io.StringIO(),
        )
        self.assertEqual(rc, 5)
        self.assertEqual(calls.count((30, signal.SIGTERM)), 1)
        self.assertNotIn(signal.SIGKILL, [sig for _, sig in calls])

    def test_signal_preflight_failure_blocks_before_effect_signal(self):
        calls = []
        plan = self.plan()

        def kill_fn(pid, sig):
            calls.append((pid, sig))
            if sig == 0 and pid == 31:
                raise PermissionError()

        rc = mod.fire(
            environ={mod.ROUTE_ENV: mod.ROUTE_VALUE},
            plan_builder=lambda: plan,
            kill_fn=kill_fn,
            out=io.StringIO(),
        )
        self.assertEqual(rc, 3)
        self.assertTrue(all(sig == 0 for _, sig in calls))

    def test_receipt_schema_order_is_fixed_and_contains_no_raw_identity(self):
        text = mod.render_receipt(mod.base_receipt(
            "fire",
            package_family="exact",
            process_snapshot="exact",
            preserved_domain="exact",
            target_domain="admitted",
            route="verified",
            effect="external_proof_required",
            result="external_proof_required",
        ))
        self.assertEqual(text.splitlines(), [
            "schema=mcl-m-termux-lifeline-stimulus.v1",
            "operation=fire",
            "package_family=exact",
            "process_snapshot=exact",
            "preserved_domain=exact",
            "target_domain=admitted",
            "route=verified",
            "effect=external_proof_required",
            "result=external_proof_required",
            "details=withheld",
        ])
        for forbidden in ("pid=", "uid=", "cmdline", "/proc/", "/data/data/"):
            self.assertNotIn(forbidden, text)

    def test_invalid_cli_is_bounded(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            rc = mod.main(["not-supported"])
        self.assertEqual(rc, 64)
        self.assertIn("result=blocked", out.getvalue())

    def test_source_has_no_escalation_or_broad_android_mutation_surface(self):
        source = MODULE_PATH.read_text()
        for forbidden in (
            "force-stop",
            "SIGKILL",
            "killall",
            "pkill",
            "device_config",
            "Settings.Global",
            "Settings.Secure",
            "appops set",
            "reboot ",
        ):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
