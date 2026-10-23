from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parents[1]
OWNER = HERE / "mcl-m-termux-job-lifeline.py"
RUN = HERE / "mcl-m-termux-job-lifeline-run"

spec = importlib.util.spec_from_file_location("mcl_job_lifeline", OWNER)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class QueueRunner:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, argv, **kwargs):
        self.calls.append(list(argv))
        if not self.responses:
            raise AssertionError("unexpected command")
        rc, out, err = self.responses.pop(0)
        return subprocess.CompletedProcess(argv, rc, out, err)


class Contract(unittest.TestCase):
    def layout(self, root: Path):
        install = root / "install"
        state = root / "state"
        return module.Layout(
            install_dir=install,
            installed_controller=install / "mcl-m-termux-job-lifeline.py",
            installed_run=install / "mcl-m-termux-job-lifeline-run",
            state_dir=state,
            job_receipt=state / "job.receipt",
            scheduler=root / "bin/termux-job-scheduler",
            python=root / "bin/python",
            heartbeat=root / "lifeline/heartbeat-client.py",
            recovery=root / "bin/mcl-m-termux-lifeline-recover",
        )

    def make_runtime_files(self, layout):
        layout.heartbeat.parent.mkdir(parents=True, exist_ok=True)
        layout.heartbeat.write_text("# heartbeat\n")
        layout.recovery.parent.mkdir(parents=True, exist_ok=True)
        layout.recovery.write_text("#!/bin/sh\n")
        os.chmod(layout.recovery, 0o700)
        layout.python.parent.mkdir(parents=True, exist_ok=True)
        layout.python.write_text("")

    def managed_line(self, layout, extra=""):
        return (
            f"Pending Job 2756: {layout.installed_run}    "
            f"(periodic: 900000ms) (persisted){extra}\n"
        )

    def test_01_fixed_identity_and_schedule_argv(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            self.assertEqual(module.JOB_ID, 2756)
            self.assertEqual(module.PERIOD_MS, 900000)
            self.assertEqual(
                module.schedule_argv(layout),
                [
                    str(layout.scheduler), "--script", str(layout.installed_run),
                    "--job-id", "2756", "--period-ms", "900000",
                    "--network", "none", "--battery-not-low", "false",
                    "--storage-not-low", "false", "--charging", "false",
                    "--persisted", "true",
                ],
            )
            self.assertNotIn("--cancel-all", OWNER.read_text())

    def test_02_pending_no_jobs(self):
        self.assertEqual(module.parse_pending("No jobs found\n"), [])

    def test_03_pending_malformed_fails(self):
        with self.assertRaises(module.OwnerBlocked):
            module.parse_pending("surprise")

    def test_04_managed_schedule(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            runner = QueueRunner([(0, self.managed_line(layout, " (network: NONE)"), "")])
            self.assertEqual(module.schedule_state(layout, runner=runner), "managed")

    def test_05_collision(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            runner = QueueRunner([(0, "Pending Job 2756: /other/script    (periodic: 900000ms) (persisted)\n", "")])
            self.assertEqual(module.schedule_state(layout, runner=runner), "collision")

    def test_06_policy_drift(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            line = f"Pending Job 2756: {layout.installed_run}    (periodic: 1800000ms) (persisted)\n"
            self.assertEqual(module.schedule_state(layout, runner=QueueRunner([(0, line, "")])), "drift")

    def test_07_disallowed_condition_is_drift(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            line = self.managed_line(layout, " (while charging)")
            self.assertEqual(module.schedule_state(layout, runner=QueueRunner([(0, line, "")])), "drift")

    def test_08_install_exact_modes_and_idempotence(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            self.assertEqual(module.install(layout, source_controller=OWNER, source_run=RUN), "managed")
            self.assertEqual(layout.installed_controller.read_bytes(), OWNER.read_bytes())
            self.assertEqual(layout.installed_run.read_bytes(), RUN.read_bytes())
            self.assertEqual(stat.S_IMODE(layout.installed_controller.stat().st_mode), 0o700)
            self.assertEqual(stat.S_IMODE(layout.installed_run.stat().st_mode), 0o700)
            before = (layout.installed_controller.read_bytes(), layout.installed_run.read_bytes())
            self.assertEqual(module.install(layout, source_controller=OWNER, source_run=RUN), "managed")
            self.assertEqual(before, (layout.installed_controller.read_bytes(), layout.installed_run.read_bytes()))

    def test_09_unmanaged_target_blocks_before_any_write(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            layout.install_dir.mkdir(parents=True)
            layout.installed_run.write_text("unmanaged\n")
            with self.assertRaises(module.OwnerBlocked):
                module.install(layout, source_controller=OWNER, source_run=RUN)
            self.assertFalse(layout.installed_controller.exists())
            self.assertEqual(layout.installed_run.read_text(), "unmanaged\n")

    def test_10_schedule_absent_uses_fixed_argv(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            module.install(layout, source_controller=OWNER, source_run=RUN)
            runner = QueueRunner([
                (0, "No jobs found\n", ""),
                (0, "Scheduling fixed job\n", ""),
                (0, self.managed_line(layout), ""),
            ])
            self.assertEqual(module.schedule(layout, runner=runner, source_controller=OWNER, source_run=RUN), "managed")
            self.assertEqual(runner.calls[1], module.schedule_argv(layout))

    def test_11_schedule_collision_never_overwrites(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            module.install(layout, source_controller=OWNER, source_run=RUN)
            runner = QueueRunner([(0, "Pending Job 2756: /other/script    (periodic: 900000ms) (persisted)\n", "")])
            with self.assertRaises(module.OwnerBlocked):
                module.schedule(layout, runner=runner, source_controller=OWNER, source_run=RUN)
            self.assertEqual(runner.calls, [module.pending_argv(layout)])

    def test_12_schedule_managed_is_idempotent(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            module.install(layout, source_controller=OWNER, source_run=RUN)
            runner = QueueRunner([(0, self.managed_line(layout), "")])
            self.assertEqual(module.schedule(layout, runner=runner, source_controller=OWNER, source_run=RUN), "managed")
            self.assertEqual(runner.calls, [module.pending_argv(layout)])

    def test_13_cancel_managed_fixed_id_only(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            runner = QueueRunner([
                (0, self.managed_line(layout), ""),
                (0, "Cancelling Job 2756\n", ""),
                (0, "No jobs found\n", ""),
            ])
            self.assertEqual(module.cancel(layout, runner=runner), "absent")
            self.assertEqual(runner.calls[1], module.cancel_argv(layout))

    def test_14_cancel_collision_refused(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            runner = QueueRunner([(0, "Pending Job 2756: /other/script    (periodic: 900000ms) (persisted)\n", "")])
            with self.assertRaises(module.OwnerBlocked):
                module.cancel(layout, runner=runner)
            self.assertEqual(len(runner.calls), 1)

    def test_15_healthy_job_run_skips_recovery(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            self.make_runtime_files(layout)
            calls = []
            def runner(argv, **kwargs):
                calls.append(list(argv))
                return subprocess.CompletedProcess(argv, 0, "", "")
            self.assertEqual(module.job_run(layout, runner=runner), 0)
            self.assertEqual(len(calls), 1)
            self.assertEqual(module.last_result_state(layout), "healthy")

    def test_16_inactive_job_run_recovers_and_rechecks(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            self.make_runtime_files(layout)
            results = [1, 0, 0]
            calls = []
            def runner(argv, **kwargs):
                calls.append(list(argv))
                return subprocess.CompletedProcess(argv, results.pop(0), "", "")
            self.assertEqual(module.job_run(layout, runner=runner), 0)
            self.assertEqual(calls[1], [str(layout.recovery)])
            self.assertEqual(module.last_result_state(layout), "recovered")

    def test_17_failed_job_run_redacts_child_output(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            self.make_runtime_files(layout)
            results = [1, 1, 1]
            def runner(argv, **kwargs):
                return subprocess.CompletedProcess(argv, results.pop(0), "secret-output", "secret-error")
            self.assertEqual(module.job_run(layout, runner=runner), 3)
            text = layout.job_receipt.read_text()
            self.assertIn("result=failed", text)
            self.assertIn("details=withheld", text)
            self.assertNotIn("secret-output", text)
            self.assertNotIn("secret-error", text)

    def test_18_check_is_read_only(self):
        with tempfile.TemporaryDirectory() as td:
            layout = self.layout(Path(td))
            receipt, rc = module.check(
                layout,
                runner=QueueRunner([(0, "No jobs found\n", "")]),
                source_controller=OWNER,
                source_run=RUN,
            )
            self.assertEqual(rc, 1)
            self.assertIn("install=missing", receipt)
            self.assertIn("schedule=absent", receipt)
            self.assertFalse(layout.install_dir.exists())
            self.assertFalse(layout.state_dir.exists())

    def test_19_run_wrapper_is_fixed_and_no_argument(self):
        text = RUN.read_text()
        self.assertIn('[ "$#" -eq 0 ] || exit 2', text)
        self.assertIn("--job-run", text)
        self.assertNotIn("$@", text)

    def test_20_public_cli_has_no_dynamic_scheduler_arguments(self):
        text = OWNER.read_text()
        self.assertIn('args == ["--schedule"]', text)
        self.assertIn('args == ["--cancel"]', text)
        self.assertNotIn("argparse", text)
        self.assertNotIn("--cancel-all", text)


if __name__ == "__main__":
    unittest.main()
