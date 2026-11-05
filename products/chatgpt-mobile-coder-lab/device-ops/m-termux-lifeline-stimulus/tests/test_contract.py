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


def write_proc(root: Path, pid: int, ppid: int, argv0: str, *, start_time: int = 1):
    proc = root / str(pid)
    proc.mkdir()
    fields = ["S", str(ppid), *(["0"] * 17), str(start_time)]
    (proc / "stat").write_bytes(
        f"{pid} ({argv0}) ".encode() + " ".join(fields).encode() + b"\n"
    )
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

    def test_disappeared_numeric_proc_entry_is_the_only_skippable_ownership_case(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            write_proc(root, 100, 1, "com.termux")
            write_proc(root, 101, 100, "/data/data/com.termux/files/usr/bin/sh")
            original = Path.stat

            def stat_with_disappearance(path, *args, **kwargs):
                if path.name == "101":
                    raise FileNotFoundError("fixture")
                return original(path, *args, **kwargs)

            with mock.patch.object(Path, "stat", new=stat_with_disappearance):
                entries = mod.scan_uid_processes(root, os.getuid())
            self.assertEqual(entries, (mod.ProcessEntry(100, 1, "com.termux"),))

    def test_production_signal_path_uses_pidfd_not_numeric_os_kill(self):
        source = MODULE_PATH.read_text(encoding="utf-8")
        self.assertNotIn("os.kill(", source)
        self.assertIn("pidfd_open", source)
        self.assertIn("pidfd_send_signal", source)

    def test_proc_stat_task_name_bytes_do_not_escape_bounded_unknown_path(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            proc = root / "100"
            proc.mkdir()
            fields = ["S", "1", *(["0"] * 17), "7"]
            (proc / "stat").write_bytes(
                b"100 (name-\xff) " + " ".join(fields).encode() + b"\n"
            )
            (proc / "cmdline").write_bytes(b"com.termux\0")
            entry = mod._read_process_entry(proc, 100)
            self.assertEqual(entry, mod.ProcessEntry(100, 1, "com.termux", 7))

    def test_proc_ownership_failure_is_unknown_not_silently_skipped(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            write_proc(root, 100, 1, "com.termux")
            original = Path.stat

            def stat_with_denial(path, *args, **kwargs):
                if path.name == "100":
                    raise PermissionError("fixture")
                return original(path, *args, **kwargs)

            with mock.patch.object(Path, "stat", new=stat_with_denial):
                with self.assertRaises(mod.StimulusUnknown):
                    mod.scan_uid_processes(root, os.getuid())

    def test_pidfd_pin_revalidates_start_time_before_signal_zero(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            for entry in self.plan().entries:
                write_proc(
                    root, entry.pid, entry.ppid, entry.argv0,
                    start_time=entry.start_time_ticks,
                )
            plan = self.plan()
            calls = []
            closed = []

            def open_with_reuse(pid):
                if pid == 30:
                    stat_path = root / str(pid) / "stat"
                    fields = ["S", "1", *(["0"] * 17), "2"]
                    stat_path.write_bytes(
                        f"{pid} (com.termux) ".encode()
                        + " ".join(fields).encode()
                        + b"\n"
                    )
                return pid + 1000

            with self.assertRaises(mod.StimulusUnknown):
                mod.pin_signal_targets(
                    plan,
                    proc_root=root,
                    uid_getter=os.getuid,
                    pidfd_open_fn=open_with_reuse,
                    pidfd_signal_fn=lambda fd, sig: calls.append((fd, sig)),
                    close_fn=closed.append,
                )
            self.assertEqual(calls, [])
            self.assertIn(1030, closed)

    def test_pidfd_signal_zero_permission_failure_blocks_before_sigterm(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            for entry in self.plan().entries:
                write_proc(
                    root, entry.pid, entry.ppid, entry.argv0,
                    start_time=entry.start_time_ticks,
                )
            calls = []
            closed = []

            def signal_fn(fd, sig):
                calls.append((fd, sig))
                if fd == 1031 and sig == 0:
                    raise PermissionError("fixture")

            with self.assertRaises(mod.StimulusBlocked):
                mod.pin_signal_targets(
                    self.plan(),
                    proc_root=root,
                    uid_getter=os.getuid,
                    pidfd_open_fn=lambda pid: pid + 1000,
                    pidfd_signal_fn=signal_fn,
                    close_fn=closed.append,
                )
            self.assertTrue(calls)
            self.assertTrue(all(sig == 0 for _, sig in calls))
            self.assertNotIn(signal.SIGTERM, [sig for _, sig in calls])
            self.assertEqual(set(closed), {1030, 1031})

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
            pin_targets_fn=lambda _plan: calls.append("pin"),
            out=out,
        )
        self.assertEqual(rc, 3)
        self.assertEqual(calls, [])
        self.assertIn("route=blocked", out.getvalue())

    def test_fire_uses_pinned_targets_once_and_self_last(self):
        calls = []
        closed = []
        plan = self.plan()

        def pin_targets(current):
            for pid in sorted(current.targets):
                calls.append((pid, 0))
            return {pid: pid for pid in current.targets}

        rc = mod.fire(
            environ={mod.ROUTE_ENV: mod.ROUTE_VALUE},
            plan_builder=lambda: plan,
            pin_targets_fn=pin_targets,
            pidfd_signal_fn=lambda pidfd, sig: calls.append((pidfd, sig)),
            close_fn=closed.append,
            out=io.StringIO(),
        )
        self.assertEqual(rc, 5)
        expected_zero = [(pid, 0) for pid in sorted(plan.targets)]
        expected_term = [
            (pid, signal.SIGTERM)
            for pid in sorted(plan.targets - {plan.self_pid})
        ] + [(plan.self_pid, signal.SIGTERM)]
        self.assertEqual(calls, expected_zero + expected_term)
        self.assertEqual(set(closed), set(plan.targets))
        self.assertTrue(all(pid not in plan.preserved for pid, _ in calls))

    def test_fire_process_lookup_during_effect_does_not_retry_or_escalate(self):
        calls = []
        plan = self.plan()

        def signal_fn(pidfd, sig):
            calls.append((pidfd, sig))
            if sig == signal.SIGTERM and pidfd == 30:
                raise ProcessLookupError()

        rc = mod.fire(
            environ={mod.ROUTE_ENV: mod.ROUTE_VALUE},
            plan_builder=lambda: plan,
            pin_targets_fn=lambda current: {pid: pid for pid in current.targets},
            pidfd_signal_fn=signal_fn,
            close_fn=lambda _fd: None,
            out=io.StringIO(),
        )
        self.assertEqual(rc, 5)
        self.assertEqual(calls.count((30, signal.SIGTERM)), 1)
        self.assertNotIn(signal.SIGKILL, [sig for _, sig in calls])

    def test_signal_preflight_failure_blocks_before_effect_signal(self):
        calls = []

        def blocked_pin(_plan):
            calls.append("preflight")
            raise mod.StimulusBlocked("target signal permission denied")

        rc = mod.fire(
            environ={mod.ROUTE_ENV: mod.ROUTE_VALUE},
            plan_builder=self.plan,
            pin_targets_fn=blocked_pin,
            pidfd_signal_fn=lambda fd, sig: calls.append((fd, sig)),
            out=io.StringIO(),
        )
        self.assertEqual(rc, 3)
        self.assertEqual(calls, ["preflight"])

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
