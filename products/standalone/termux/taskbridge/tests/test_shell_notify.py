from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import shell_notify


class ShellNotifyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.home = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_safe_label_never_exposes_assignment_or_arguments(self):
        self.assertEqual(shell_notify.safe_label('/usr/bin/python secret.py --token nope'), 'python')
        self.assertEqual(shell_notify.safe_label('TOKEN=supersecret python app.py'), 'Termux 명령')
        self.assertEqual(shell_notify.safe_label('weird;command'), 'Termux 명령')

    def test_install_is_idempotent_and_remove_preserves_unrelated_rc(self):
        rc = self.home / '.bashrc'
        rc.write_text('export KEEP_ME=1\n')
        with patch('shell_notify.notifier.available', return_value=True):
            first = shell_notify.install('bash', 10, home=self.home)
            second = shell_notify.install('bash', 10, home=self.home)
        self.assertTrue(first['installed'])
        self.assertTrue(second['installed'])
        text = rc.read_text()
        self.assertEqual(text.count(shell_notify.MARKER_START), 1)
        self.assertIn('export KEEP_ME=1', text)
        removed = shell_notify.remove('bash', home=self.home)
        self.assertTrue(removed['removed'])
        self.assertEqual(rc.read_text(), 'export KEEP_ME=1\n')
        self.assertFalse(shell_notify.installed_hook_path('bash', self.home).exists())

    def test_unmatched_marker_is_not_destructively_removed(self):
        text = 'keep\n' + shell_notify.MARKER_START + '\nstill keep\n'
        self.assertEqual(shell_notify._strip_owned_block(text), text)

    @patch('shell_notify.notifier.notify', return_value=True)
    def test_emit_uses_safe_label_and_shell_scoped_notification_id(self, notify):
        ok = shell_notify.emit(7, 'TOKEN=secret', 12, 4321)
        self.assertTrue(ok)
        args, kwargs = notify.call_args
        self.assertEqual(args[0], 'Termux 작업 실패')
        self.assertNotIn('secret', args[1])
        self.assertIn('exit 7', args[1])
        self.assertEqual(kwargs['notification_id'], 'taskbridge-shell-4321')

    @unittest.skipUnless(shutil.which('bash'), 'bash is required')
    def test_bash_hook_fires_after_completion_and_preserves_status(self):
        emitter = self.home / 'emit.py'
        log = self.home / 'emit.log'
        emitter.write_text(
            "import os, sys\n"
            "with open(os.environ['TB_LOG'], 'a') as f:\n"
            "    f.write(' '.join(sys.argv[1:]) + '\\n')\n"
        )
        shell_notify.install('bash', 0, home=self.home)
        hook = shell_notify.installed_hook_path('bash', self.home)
        hook.write_text(shell_notify._render_hook('bash', 0, python_exe=sys.executable, script_path=emitter))
        env = os.environ.copy()
        env.update({'HOME': str(self.home), 'TB_LOG': str(log), 'PS1': 'P> '})
        proc = subprocess.run(
            ['bash', '--noprofile', '--rcfile', str(self.home / '.bashrc'), '-i'],
            input='false\necho STATUS:$?\nexit\n',
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            timeout=10,
            check=False,
        )
        self.assertEqual(proc.returncode, 0)
        self.assertIn('STATUS:1', proc.stdout)
        lines = log.read_text().splitlines()
        failure = [line for line in lines if '--label false' in line]
        self.assertEqual(len(failure), 1)
        self.assertIn('--status 1', failure[0])

    @unittest.skipUnless(shutil.which('bash'), 'bash is required')
    def test_bash_threshold_suppresses_short_command(self):
        emitter = self.home / 'emit.py'
        log = self.home / 'emit.log'
        emitter.write_text(
            "import os, sys\n"
            "with open(os.environ['TB_LOG'], 'a') as f:\n"
            "    f.write(' '.join(sys.argv[1:]) + '\\n')\n"
        )
        shell_notify.install('bash', 2, home=self.home)
        shell_notify.installed_hook_path('bash', self.home).write_text(
            shell_notify._render_hook('bash', 2, python_exe=sys.executable, script_path=emitter)
        )
        env = os.environ.copy()
        env.update({'HOME': str(self.home), 'TB_LOG': str(log), 'PS1': 'P> '})
        subprocess.run(
            ['bash', '--noprofile', '--rcfile', str(self.home / '.bashrc'), '-i'],
            input='true\nexit\n',
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            timeout=10,
            check=False,
        )
        self.assertFalse(log.exists())

    @unittest.skipUnless(shutil.which('bash'), 'bash is required')
    def test_bash_existing_debug_trap_is_not_replaced(self):
        rc = self.home / '.bashrc'
        rc.write_text("trap 'printf existing >/dev/null' DEBUG\n")
        shell_notify.install('bash', 0, home=self.home)
        env = os.environ.copy()
        env.update({'HOME': str(self.home), 'PS1': 'P> '})
        proc = subprocess.run(
            ['bash', '--noprofile', '--rcfile', str(rc), '-i'],
            input="printf 'LOADED=%s\\n' \"${__TASKBRIDGE_SHELL_NOTIFY_LOADED:-0}\"\ntrap -p DEBUG\nexit\n",
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            timeout=10,
            check=False,
        )
        self.assertIn('LOADED=0', proc.stdout)
        self.assertIn("trap -- 'printf existing >/dev/null' DEBUG", proc.stdout)
        self.assertIn('existing DEBUG trap detected', proc.stderr)

    @unittest.skipUnless(shutil.which('bash'), 'bash is required')
    def test_bash_existing_prompt_command_is_composed(self):
        old_log = self.home / 'old.log'
        emit_log = self.home / 'emit.log'
        emitter = self.home / 'emit.py'
        emitter.write_text(
            "import os, sys\n"
            "with open(os.environ['TB_LOG'], 'a') as f:\n"
            "    f.write(' '.join(sys.argv[1:]) + '\\n')\n"
        )
        rc = self.home / '.bashrc'
        rc.write_text("PROMPT_COMMAND='printf \"old:%s\\n\" \"$?\" >> \"$TB_OLD_LOG\"'\n")
        shell_notify.install('bash', 0, home=self.home)
        shell_notify.installed_hook_path('bash', self.home).write_text(
            shell_notify._render_hook('bash', 0, python_exe=sys.executable, script_path=emitter)
        )
        env = os.environ.copy()
        env.update({'HOME': str(self.home), 'TB_LOG': str(emit_log), 'TB_OLD_LOG': str(old_log), 'PS1': 'P> '})
        proc = subprocess.run(
            ['bash', '--noprofile', '--rcfile', str(rc), '-i'],
            input='false\necho STATUS:$?\nexit\n',
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            timeout=10,
            check=False,
        )
        self.assertIn('STATUS:1', proc.stdout)
        self.assertIn('old:1', old_log.read_text().splitlines())
        self.assertTrue(any('--status 1 --label false' in line for line in emit_log.read_text().splitlines()))

    def test_zsh_template_uses_native_preexec_precmd_hooks(self):
        text = shell_notify._render_hook('zsh', 10, python_exe='/python', script_path='/notify.py')
        self.assertIn('add-zsh-hook preexec', text)
        self.assertIn('add-zsh-hook precmd', text)
        self.assertIn('__TASKBRIDGE_ACTIVE=0', text)


if __name__ == '__main__':
    unittest.main()
