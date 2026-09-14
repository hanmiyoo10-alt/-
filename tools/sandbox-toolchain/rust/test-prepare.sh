#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
prepare="$script_dir/prepare.sh"

fail() {
  echo "sandbox-rust-bridge-contract: FAIL $1" >&2
  exit 1
}

for cmd in awk cmp cp grep mkdir mktemp rm sha256sum tar; do
  command -v "$cmd" >/dev/null 2>&1 || fail "missing-$cmd"
done

work=$(mktemp -d)
cleanup() { rm -rf "$work"; }
trap cleanup EXIT HUP INT TERM

host=rust-1.98.1-x86_64-unknown-linux-gnu.tar.xz
target=rust-std-1.98.1-aarch64-linux-android.tar.xz
bundle=rust-1.98.1-linux-x86_64-plus-android-aarch64.tar

make_fixture() {
  dir=$1
  mkdir -p "$dir"
  printf 'host-fixture\n' > "$dir/$host"
  printf 'target-fixture\n' > "$dir/$target"
  for file in "$host" "$target"; do
    hash=$(sha256sum "$dir/$file" | awk '{print $1}')
    printf '%s  %s\n' "$hash" "$file" > "$dir/$file.sha256"
  done
}

make_fixture "$work/input"
sh "$prepare" --input-dir "$work/input" --output-dir "$work/out-a" >/dev/null
sh "$prepare" --input-dir "$work/input" --output-dir "$work/out-b" >/dev/null

cmp "$work/out-a/$bundle" "$work/out-b/$bundle" >/dev/null || fail nondeterministic-bundle
cmp "$work/out-a/RUST_TOOLCHAIN_PROVENANCE.tsv" "$work/out-b/RUST_TOOLCHAIN_PROVENANCE.tsv" >/dev/null || fail nondeterministic-provenance
for name in "$host" "$host.sha256" "$target" "$target.sha256"; do
  tar -tf "$work/out-a/$bundle" | grep -Fx "$name" >/dev/null || fail "bundle-missing-$name"
done

tab=$(printf '\t')
grep -F "rust_version${tab}1.98.1" "$work/out-a/RUST_TOOLCHAIN_PROVENANCE.tsv" >/dev/null || fail missing-version
grep -F "host${tab}x86_64-unknown-linux-gnu" "$work/out-a/RUST_TOOLCHAIN_PROVENANCE.tsv" >/dev/null || fail missing-host
grep -F "target${tab}aarch64-linux-android" "$work/out-a/RUST_TOOLCHAIN_PROVENANCE.tsv" >/dev/null || fail missing-target

grep -F "payload${tab}$host${tab}" "$work/out-a/RUST_TOOLCHAIN_PROVENANCE.tsv" >/dev/null || fail missing-host-payload
grep -F "payload${tab}$target${tab}" "$work/out-a/RUST_TOOLCHAIN_PROVENANCE.tsv" >/dev/null || fail missing-target-payload

after_tamper="$work/tamper"
cp -R "$work/input" "$after_tamper"
printf 'tampered\n' >> "$after_tamper/$host"
if sh "$prepare" --input-dir "$after_tamper" --output-dir "$work/out-tamper" >"$work/tamper.log" 2>&1; then
  fail tamper-accepted
fi
grep -F 'reason=CHECKSUM_MISMATCH' "$work/tamper.log" >/dev/null || fail wrong-tamper-reason
[ ! -e "$work/out-tamper" ] || fail tamper-output-exposed

missing="$work/missing"
cp -R "$work/input" "$missing"
rm "$missing/$target.sha256"
if sh "$prepare" --input-dir "$missing" --output-dir "$work/out-missing" >"$work/missing.log" 2>&1; then
  fail missing-sidecar-accepted
fi
grep -F 'reason=MISSING_SIDECAR' "$work/missing.log" >/dev/null || fail wrong-missing-reason
[ ! -e "$work/out-missing" ] || fail missing-output-exposed

printf '%s\n' 'sandbox-rust-bridge-contract: PASS'
