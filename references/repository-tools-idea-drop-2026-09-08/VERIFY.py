"""Validate archived bytes without importing or executing upstream code."""
import hashlib
import json
from pathlib import Path
root = Path(__file__).resolve().parent
manifest = json.loads((root / "MANIFEST.json").read_text(encoding="utf-8"))
count = 0
for repo in manifest["repositories"]:
    for item in repo["files"]:
        data = (root / repo["prefix"] / item["path"]).read_bytes()
        digest = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        if len(data) != item["bytes"] or digest != item["git_blob_sha1"]:
            raise SystemExit("FAIL: " + repo["repository"] + "/" + item["path"])
        count += 1
print("PASS: %d original files match pinned upstream Git blobs" % count)
