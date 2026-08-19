#!/usr/bin/env bash
set -euo pipefail

VERSION="${USAGE_DASHBOARD_GH_VENDOR_VERSION:-2.97.0}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="$SCRIPT_DIR/vendor/gh/$VERSION"
BASE_URL="https://github.com/cli/cli/releases/download/v${VERSION}"

AMD64_ASSET="gh_${VERSION}_linux_amd64.tar.gz"
ARM64_ASSET="gh_${VERSION}_linux_arm64.tar.gz"
CHECKSUM_ASSET="gh_${VERSION}_checksums.txt"

case "$VERSION" in
  2.97.0)
    AMD64_SHA="a2c9b8497e1f85b1ad0dfcb78b5a622e098801b8e461e459e88e1ee12f018112"
    ARM64_SHA="73ea440ecad9c9e284429997ee6f93577bc6f7bc6fba357ef62c53ad8fb641a5"
    CHECKSUM_SHA="61905c69ec8660f310814ec98395cdd0c2d07aabf024c597ec45813984a02334"
    ;;
  *)
    printf '[usage-dashboard-gh-vendor] ERROR: unsupported pinned version: %s\n' "$VERSION" >&2
    exit 1
    ;;
esac

log() { printf '[usage-dashboard-gh-vendor] %s\n' "$*"; }
fail() { printf '[usage-dashboard-gh-vendor] ERROR: %s\n' "$*" >&2; exit 1; }

sha256_of() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
    return
  fi
  fail 'sha256sum or shasum is required'
}

download() {
  local url="$1"
  local out="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fL --retry 3 --connect-timeout 15 --max-time 180 -o "$out" "$url"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget --timeout=30 --tries=3 -O "$out" "$url"
    return
  fi
  fail 'curl or wget is required to materialize vendored gh assets'
}

verify_exact() {
  local file="$1"
  local expected="$2"
  [ -f "$file" ] || return 1
  [ "$(sha256_of "$file")" = "$expected" ]
}

verify_upstream_manifest() {
  local checksums="$1"
  local file="$2"
  local asset="$3"
  local expected
  expected="$(awk -v asset="$asset" '$2 == asset { print $1; exit }' "$checksums")"
  [ -n "$expected" ] || fail "asset missing from upstream checksum manifest: $asset"
  [ "$(sha256_of "$file")" = "$expected" ] || fail "upstream checksum mismatch: $asset"
}

mkdir -p "$DEST_DIR"

if verify_exact "$DEST_DIR/$CHECKSUM_ASSET" "$CHECKSUM_SHA" \
  && verify_exact "$DEST_DIR/$AMD64_ASSET" "$AMD64_SHA" \
  && verify_exact "$DEST_DIR/$ARM64_ASSET" "$ARM64_SHA"; then
  log "vendored gh v${VERSION} assets already complete"
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

log "downloading upstream checksum manifest"
download "$BASE_URL/$CHECKSUM_ASSET" "$tmp/$CHECKSUM_ASSET"
verify_exact "$tmp/$CHECKSUM_ASSET" "$CHECKSUM_SHA" || fail 'checksum manifest hash mismatch'

for spec in "$AMD64_ASSET:$AMD64_SHA" "$ARM64_ASSET:$ARM64_SHA"; do
  asset="${spec%%:*}"
  expected="${spec#*:}"
  log "downloading $asset"
  download "$BASE_URL/$asset" "$tmp/$asset"
  verify_exact "$tmp/$asset" "$expected" || fail "pinned checksum mismatch: $asset"
  verify_upstream_manifest "$tmp/$CHECKSUM_ASSET" "$tmp/$asset" "$asset"
done

cp "$tmp/$CHECKSUM_ASSET" "$DEST_DIR/$CHECKSUM_ASSET"
cp "$tmp/$AMD64_ASSET" "$DEST_DIR/$AMD64_ASSET"
cp "$tmp/$ARM64_ASSET" "$DEST_DIR/$ARM64_ASSET"

log "vendored gh v${VERSION} assets materialized and verified"
