from pathlib import Path
import base64
import gzip
import hashlib

PARTS = Path('plugins/basecore/.materialize')
EXPECTED_B64_CHARS = 23064
EXPECTED_RAW_BYTES = 67367
EXPECTED_SHA256 = '76bbf4f89651fcc26381722b8ee971a8ef0b3b87579813fb5560af4b9e0de690'

part_files = sorted(PARTS.glob('*.b64'))
if not part_files:
    raise SystemExit('BaseCore materializer payload missing')
encoded = ''.join(p.read_text(encoding='utf-8').strip() for p in part_files)
if len(encoded) != EXPECTED_B64_CHARS:
    raise SystemExit(f'BaseCore materializer payload length mismatch: {len(encoded)} != {EXPECTED_B64_CHARS}')
try:
    raw = gzip.decompress(base64.b64decode(encoded, validate=True))
except Exception as exc:
    raise SystemExit(f'BaseCore materializer decode failed: {exc}')
if len(raw) != EXPECTED_RAW_BYTES:
    raise SystemExit(f'BaseCore materializer raw length mismatch: {len(raw)} != {EXPECTED_RAW_BYTES}')
sha = hashlib.sha256(raw).hexdigest()
if sha != EXPECTED_SHA256:
    raise SystemExit(f'BaseCore materializer sha256 mismatch: {sha} != {EXPECTED_SHA256}')
text = raw.decode('utf-8')
root = Path('plugins/basecore')
root.mkdir(parents=True, exist_ok=True)
for name in ('latest.js', 'install.js'):
    (root / name).write_text(text, encoding='utf-8')
print(f'BaseCore materialized: {len(raw)} bytes sha256={sha}')
