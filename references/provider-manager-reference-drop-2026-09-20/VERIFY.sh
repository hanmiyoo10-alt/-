#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
sha256sum -c SHA256SUMS
test "$(wc -c < yumi-provider-manager-v1.16.3.js)" -eq 1018363
test "$(wc -c < cupcake-provider-manager-v1.35.11-production.js)" -eq 1195945
test "$(wc -c < cupcake-provider-manager-v1.62.1-production.js)" -eq 1727902
python -m json.tool MANIFEST.json >/dev/null
python -m json.tool LATEST_OBSERVED.json >/dev/null
printf '%s\n' 'Provider Manager reference archive: PASS'
