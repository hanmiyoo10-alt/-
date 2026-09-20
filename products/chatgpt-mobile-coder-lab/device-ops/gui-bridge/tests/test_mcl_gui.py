import base64
import json
import os
from pathlib import Path
import socket
import tempfile
import threading
import unittest

ROOT = Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(ROOT))
import mcl_gui

class FakeServer:
    def __init__(self, path, response):
        self.path = path
        self.response = response
        self.request = None
        self.ready = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True)

    def _run(self):
        try:
            os.unlink(self.path)
        except FileNotFoundError:
            pass
        server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        server.bind(self.path)
        server.listen(1)
        self.ready.set()
        conn, _ = server.accept()
        with conn:
            line = conn.makefile("rb").readline()
            self.request = json.loads(line.decode())
            conn.sendall(json.dumps(self.response).encode() + b"\n")
        server.close()

    def start(self):
        self.thread.start()
        self.ready.wait(timeout=2)

    def join(self):
        self.thread.join(timeout=3)
        try:
            os.unlink(self.path)
        except FileNotFoundError:
            pass

class CliTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["MCL_GUI_TEST_MODE"] = "1"
        os.environ["MCL_GUI_TEST_SOCKET"] = str(Path(self.tmp.name) / "sock")
        os.environ["MCL_GUI_TEST_TMP"] = self.tmp.name

    def tearDown(self):
        for key in ("MCL_GUI_TEST_MODE", "MCL_GUI_TEST_SOCKET", "MCL_GUI_TEST_TMP"):
            os.environ.pop(key, None)
        self.tmp.cleanup()

    def test_fixed_production_socket_ignores_override_without_test_mode(self):
        os.environ.pop("MCL_GUI_TEST_MODE")
        self.assertEqual(mcl_gui._socket_address(), "\0mcl-gui-v1")
        os.environ["MCL_GUI_TEST_MODE"] = "1"

    def test_status_round_trip(self):
        server = FakeServer(os.environ["MCL_GUI_TEST_SOCKET"], {"schema":"mcl-gui.v1","status":"PASS","op":"status"})
        server.start()
        response = mcl_gui._request({"schema":"mcl-gui.v1","op":"status"})
        server.join()
        self.assertEqual(response["status"], "PASS")
        self.assertEqual(server.request["op"], "status")

    def test_screenshot_materializes_inside_private_test_root_and_cleans(self):
        raw = b"\x89PNG\r\n\x1a\nfixture"
        response = mcl_gui.materialize_screenshot({
            "schema":"mcl-gui.v1",
            "status":"PASS",
            "screenshot_png_b64":base64.b64encode(raw).decode(),
        })
        path = Path(response["screenshot_path"])
        self.assertEqual(path.read_bytes(), raw)
        self.assertTrue(response["cleanup_required"])
        self.assertNotIn("screenshot_png_b64", response)
        mcl_gui.cleanup_screenshot(path)
        self.assertFalse(path.exists())

    def test_text_and_timeout_are_bounded(self):
        with self.assertRaises(RuntimeError):
            mcl_gui._bounded("x" * 513, "TEXT")
        args = mcl_gui.parser().parse_args(["wait-text", "OK", "16"])
        with self.assertRaises(RuntimeError):
            mcl_gui._payload(args)

if __name__ == "__main__":
    unittest.main()
