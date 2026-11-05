import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import stat
import tempfile
import threading
import unittest
from unittest import mock

OWNER = Path(__file__).resolve().parents[1]
MODULE_PATH = OWNER / "mcl-m-termux-api-callback.py"

spec = importlib.util.spec_from_file_location("mcl_termux_api_callback", MODULE_PATH)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)


class FakeProc:
    def poll(self):
        return 0

    def wait(self, timeout=None):
        return 0

    def terminate(self):
        return None

    def kill(self):
        return None


def connector(path: Path, payload: bytes):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
        client.connect(str(path))
        try:
            client.sendall(payload)
        except BrokenPipeError:
            pass


class CallbackContractTests(unittest.TestCase):
    def test_broadcast_argv_is_fixed_and_shell_free(self):
        path = Path("/tmp/fixed.sock")
        self.assertEqual(
            mod.build_broadcast_argv(path),
            [
                "/data/data/com.termux/files/usr/bin/am",
                "broadcast",
                "--user",
                "0",
                "-n",
                "com.termux.api/.TermuxApiReceiver",
                "--es",
                "socket_output",
                "/tmp/fixed.sock",
                "--es",
                "api_method",
                "BatteryStatus",
            ],
        )
        source = MODULE_PATH.read_text()
        self.assertIn("shell=False", source)
        self.assertNotIn("shell=True", source)
        self.assertNotIn("socket_input", source)

    def test_private_directory_is_created_0700(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            socket_dir = mod.prepare_socket_dir(home, os.getuid())
            self.assertEqual(stat.S_IMODE(socket_dir.stat().st_mode), 0o700)
            self.assertEqual(socket_dir.stat().st_uid, os.getuid())

    def test_private_directory_wrong_mode_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            socket_dir = mod.prepare_socket_dir(home, os.getuid())
            os.chmod(socket_dir, 0o755)
            with self.assertRaises(mod.ProbeBlocked):
                mod.prepare_socket_dir(home, os.getuid())

    def test_symlink_socket_directory_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            cache = home / ".cache"
            cache.mkdir(mode=0o700)
            target = home / "target"
            target.mkdir(mode=0o700)
            (cache / mod.SOCKET_DIR_NAME).symlink_to(target, target_is_directory=True)
            with self.assertRaises(mod.ProbeBlocked):
                mod.prepare_socket_dir(home, os.getuid())

    def test_socket_path_is_bounded_and_token_is_hex_only(self):
        with tempfile.TemporaryDirectory() as td:
            socket_dir = Path(td)
            path = mod.make_socket_path(socket_dir, "0123456789ab")
            self.assertTrue(str(path).endswith("cb-0123456789ab.sock"))
            with self.assertRaises(mod.ProbeBlocked):
                mod.make_socket_path(socket_dir, "not-hex")
        with tempfile.TemporaryDirectory() as td:
            long_dir = Path(td) / ("x" * 100)
            long_dir.mkdir()
            with self.assertRaises(mod.ProbeBlocked):
                mod.make_socket_path(long_dir, "0123456789ab")

    def test_decode_payload_requires_bounded_utf8_json_object(self):
        self.assertEqual(mod.decode_payload(b'{"present":true}'), {"present": True})
        with self.assertRaises(mod.ProbeBlocked) as invalid_utf8:
            mod.decode_payload(b"\xff")
        self.assertEqual(invalid_utf8.exception.payload, "invalid_utf8")
        with self.assertRaises(mod.ProbeBlocked) as invalid_json:
            mod.decode_payload(b"[]")
        self.assertEqual(invalid_json.exception.payload, "invalid_json")
        with self.assertRaises(mod.ProbeBlocked) as oversize:
            mod.decode_payload(b"x" * (mod.MAX_PAYLOAD_BYTES + 1))
        self.assertEqual(oversize.exception.payload, "oversize")

    def test_accept_payload_checks_real_same_uid_peer(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "peer.sock"
            server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            try:
                server.bind(str(path))
                server.listen(1)
                thread = threading.Thread(
                    target=connector, args=(path, b'{"present":true}'), daemon=True
                )
                thread.start()
                value = mod.accept_payload(
                    server,
                    expected_uid=os.getuid(),
                    timeout_seconds=1.0,
                )
                thread.join(timeout=1.0)
                self.assertEqual(value, {"present": True})
            finally:
                server.close()
                path.unlink(missing_ok=True)

    def test_accept_payload_peer_mismatch_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "peer.sock"
            server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            try:
                server.bind(str(path))
                server.listen(1)
                thread = threading.Thread(
                    target=connector, args=(path, b'{"present":true}'), daemon=True
                )
                thread.start()
                with self.assertRaises(mod.ProbeBlocked) as mismatch:
                    mod.accept_payload(
                        server,
                        expected_uid=os.getuid(),
                        timeout_seconds=1.0,
                        peer_uid_reader=lambda _conn: os.getuid() + 1,
                    )
                thread.join(timeout=1.0)
                self.assertEqual(mismatch.exception.peer, "mismatch")
            finally:
                server.close()
                path.unlink(missing_ok=True)

    def test_accept_payload_timeout_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "timeout.sock"
            server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            try:
                server.bind(str(path))
                server.listen(1)
                with self.assertRaises(mod.ProbeBlocked) as blocked:
                    mod.accept_payload(
                        server,
                        expected_uid=os.getuid(),
                        timeout_seconds=0.05,
                    )
                self.assertEqual(blocked.exception.connection, "timeout")
            finally:
                server.close()
                path.unlink(missing_ok=True)

    def test_accept_payload_trickle_uses_one_absolute_deadline(self):
        class FakeConn:
            def __init__(self):
                self.timeouts = []
                self.recv_calls = 0

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def settimeout(self, value):
                self.timeouts.append(value)

            def recv(self, _size):
                self.recv_calls += 1
                return b"x"

        class FakeServer:
            def __init__(self, conn):
                self.conn = conn
                self.timeout = None

            def settimeout(self, value):
                self.timeout = value

            def accept(self):
                return self.conn, None

        conn = FakeConn()
        server = FakeServer(conn)
        with mock.patch.object(
            mod.time,
            "monotonic",
            side_effect=[0.0, 0.2, 0.6, 1.01],
        ):
            with self.assertRaises(mod.ProbeBlocked) as blocked:
                mod.accept_payload(
                    server,
                    expected_uid=os.getuid(),
                    timeout_seconds=1.0,
                    peer_uid_reader=lambda _conn: os.getuid(),
                )

        self.assertEqual(blocked.exception.connection, "connected")
        self.assertEqual(blocked.exception.peer, "same_uid")
        self.assertEqual(blocked.exception.payload, "unknown")
        self.assertEqual(conn.recv_calls, 2)
        self.assertEqual(len(conn.timeouts), 2)
        self.assertAlmostEqual(conn.timeouts[0], 0.8)
        self.assertAlmostEqual(conn.timeouts[1], 0.4)

    def test_full_probe_success_redacts_payload_and_cleans_socket(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            threads = []

            def launch(path):
                thread = threading.Thread(
                    target=connector,
                    args=(path, b'{"percentage":83,"technology":"sensitive"}'),
                    daemon=True,
                )
                threads.append(thread)
                thread.start()
                return FakeProc()

            receipt = mod.run_battery_status(
                home=home,
                timeout_seconds=1.0,
                launcher=launch,
                token_factory=lambda: "0123456789ab",
            )
            for thread in threads:
                thread.join(timeout=1.0)

            self.assertEqual(receipt["result"], "pass")
            rendered = mod.render_receipt(receipt)
            self.assertNotIn("percentage", rendered)
            self.assertNotIn("sensitive", rendered)
            self.assertNotIn("83", rendered)
            socket_dir = home / ".cache" / mod.SOCKET_DIR_NAME
            self.assertEqual(list(socket_dir.glob("*.sock")), [])

    def test_full_probe_peer_mismatch_cleans_socket(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            threads = []

            def launch(path):
                thread = threading.Thread(
                    target=connector, args=(path, b'{"present":true}'), daemon=True
                )
                threads.append(thread)
                thread.start()
                return FakeProc()

            receipt = mod.run_battery_status(
                home=home,
                timeout_seconds=1.0,
                launcher=launch,
                peer_uid_reader=lambda _conn: os.getuid() + 1,
                token_factory=lambda: "0123456789ab",
            )
            for thread in threads:
                thread.join(timeout=1.0)

            self.assertEqual(receipt["result"], "blocked")
            self.assertEqual(receipt["peer"], "mismatch")
            socket_dir = home / ".cache" / mod.SOCKET_DIR_NAME
            self.assertEqual(list(socket_dir.glob("*.sock")), [])

    def test_full_probe_timeout_cleans_socket(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)

            receipt = mod.run_battery_status(
                home=home,
                timeout_seconds=0.05,
                launcher=lambda _path: FakeProc(),
                token_factory=lambda: "0123456789ab",
            )

            self.assertEqual(receipt["result"], "blocked")
            self.assertEqual(receipt["connection"], "timeout")
            socket_dir = home / ".cache" / mod.SOCKET_DIR_NAME
            self.assertEqual(list(socket_dir.glob("*.sock")), [])

    def test_invalid_cli_is_bounded_and_does_not_touch_runtime(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            rc = mod.main(["not-supported"])
        self.assertEqual(rc, 64)
        text = out.getvalue()
        self.assertIn("result=blocked", text)
        self.assertIn("details=withheld", text)
        self.assertNotIn("BatteryStatus", text)

    def test_receipt_schema_order_is_fixed(self):
        text = mod.render_receipt(
            mod.base_receipt(
                connection="connected",
                peer="same_uid",
                payload="valid_json",
                result="pass",
            )
        )
        self.assertEqual(
            text.splitlines(),
            [
                "schema=mcl-m-termux-api-callback.v1",
                "operation=battery_status",
                "transport=filesystem_unix",
                "connection=connected",
                "peer=same_uid",
                "payload=valid_json",
                "result=pass",
                "details=withheld",
            ],
        )


if __name__ == "__main__":
    unittest.main()
