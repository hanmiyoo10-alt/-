#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

src="$(cd "$(dirname "$0")" && pwd)"
out="${1:-/tmp/provider-manager-reference-restored}"
mkdir -p "$out"

cp "$src/yumi-provider-manager-v1.16.3.js" "$out/yumi-provider-manager-v1.16.3.js"
cp "$src/cupcake-provider-manager-v1.35.11-production.js" "$out/cupcake-provider-manager-v1.35.11-production.js"
cp "$src/cupcake-provider-manager-v1.62.1-production.js" "$out/cupcake-provider-manager-v1.62.1-production.js"

(
  cd "$out"
  sha256sum -c "$src/SHA256SUMS"
)

printf 'Restored exact reference sources to %s\n' "$out"
