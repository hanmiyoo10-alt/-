#!/bin/sh
set -eu

input_dir=
output_dir=

rust_version=1.98.1
host=x86_64-unknown-linux-gnu
target=aarch64-linux-android
source_base=https://static.rust-lang.org/dist
host_file="rust-${rust_version}-${host}.tar.xz"
target_file="rust-std-${rust_version}-${target}.tar.xz"
bundle_name="rust-${rust_version}-linux-x86_64-plus-android-aarch64.tar"
provenance_name=RUST_TOOLCHAIN_PROVENANCE.tsv

usage() {
  echo "usage: $0 --input-dir DIR --output-dir DIR" >&2
}

fail() {
  echo "SANDBOX_RUST_BRIDGE_PREPARE status=FAIL reason=$1"
  exit 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --input-dir)
      [ "$#" -ge 2 ] || { usage; fail MISSING_INPUT_DIR_VALUE; }
      input_dir=$2
      shift 2
      ;;
    --output-dir)
      [ "$#" -ge 2 ] || { usage; fail MISSING_OUTPUT_DIR_VALUE; }
      output_dir=$2
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      fail UNKNOWN_ARGUMENT
      ;;
  esac
done

[ -n "$input_dir" ] || fail INPUT_DIR_REQUIRED
[ -n "$output_dir" ] || fail OUTPUT_DIR_REQUIRED
[ -d "$input_dir" ] && [ -r "$input_dir" ] || fail INPUT_DIR_UNAVAILABLE
[ ! -e "$output_dir" ] || fail OUTPUT_DIR_EXISTS

for cmd in awk chmod cp dirname mkdir mktemp mv rm sha256sum tar tr wc; do
  command -v "$cmd" >/dev/null 2>&1 || fail "MISSING_COMMAND_$cmd"
done

parent=$(dirname "$output_dir")
[ -d "$parent" ] && [ -w "$parent" ] || fail OUTPUT_PARENT_UNAVAILABLE

tmp_dir=$(mktemp -d "$parent/.sandbox-rust-bridge.XXXXXX") || fail TEMP_DIR_CREATE_FAILED
cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT HUP INT TERM
stage="$tmp_dir/stage"
out="$tmp_dir/out"
mkdir -p "$stage" "$out" || fail TEMP_LAYOUT_FAILED
provenance="$out/$provenance_name"

verify_one() {
  file=$1
  payload="$input_dir/$file"
  sidecar="$input_dir/$file.sha256"
  [ -f "$payload" ] && [ -r "$payload" ] || fail MISSING_PAYLOAD
  [ -f "$sidecar" ] && [ -r "$sidecar" ] || fail MISSING_SIDECAR

  expected=$(awk 'NR == 1 { print $1; exit }' "$sidecar" | tr 'A-F' 'a-f')
  case "$expected" in ''|*[!0-9a-f]*) fail INVALID_SIDECAR_SHA256 ;; esac
  [ "${#expected}" -eq 64 ] || fail INVALID_SIDECAR_SHA256
  actual=$(sha256sum "$payload" | awk '{print $1}')
  [ "$actual" = "$expected" ] || fail CHECKSUM_MISMATCH

  size=$(wc -c < "$payload" | tr -d '[:space:]')
  case "$size" in ''|*[!0-9]*) fail PAYLOAD_SIZE_INVALID ;; esac
  printf 'payload\t%s\t%s\t%s\n' "$file" "$size" "$actual" >> "$provenance"
  cp "$payload" "$stage/$file" || fail STAGE_COPY_FAILED
  cp "$sidecar" "$stage/$file.sha256" || fail STAGE_COPY_FAILED
  chmod 0644 "$stage/$file" "$stage/$file.sha256" || fail STAGE_MODE_FAILED
}

{
  printf 'schema\tsandbox-rust-bridge.v1\n'
  printf 'source_base\t%s\n' "$source_base"
  printf 'rust_version\t%s\n' "$rust_version"
  printf 'host\t%s\n' "$host"
  printf 'target\t%s\n' "$target"
} > "$provenance" || fail PROVENANCE_WRITE_FAILED

verify_one "$host_file"
verify_one "$target_file"
bundle="$out/$bundle_name"
tar --sort=name --format=ustar --mtime='@0' --owner=0 --group=0 --numeric-owner \
  -C "$stage" -cf "$bundle" \
  "$host_file" "$host_file.sha256" \
  "$target_file" "$target_file.sha256" \
  || fail BUNDLE_CREATE_FAILED

bundle_size=$(wc -c < "$bundle" | tr -d '[:space:]')
bundle_sha256=$(sha256sum "$bundle" | awk '{print $1}')
printf 'bundle\t%s\t%s\t%s\n' "$bundle_name" "$bundle_size" "$bundle_sha256" >> "$provenance"

mv "$out" "$output_dir" || fail OUTPUT_COMMIT_FAILED
trap - EXIT HUP INT TERM
printf '%s\n' "SANDBOX_RUST_BRIDGE_PREPARE status=PASS rust_version=$rust_version host=$host target=$target bundle=$bundle_name size=$bundle_size sha256=$bundle_sha256 output_dir=$output_dir"
