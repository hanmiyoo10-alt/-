#!/bin/sh
set -eu

manifest=
parts_dir=
output=

usage() {
  echo "usage: $0 --manifest FILE [--parts-dir DIR] --output FILE" >&2
}

fail() {
  echo "SANDBOX_INGRESS_UNPACK status=FAIL reason=$1"
  exit 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --manifest)
      [ "$#" -ge 2 ] || { usage; fail MISSING_MANIFEST_VALUE; }
      manifest=$2
      shift 2
      ;;
    --parts-dir)
      [ "$#" -ge 2 ] || { usage; fail MISSING_PARTS_DIR_VALUE; }
      parts_dir=$2
      shift 2
      ;;
    --output)
      [ "$#" -ge 2 ] || { usage; fail MISSING_OUTPUT_VALUE; }
      output=$2
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

[ -n "$manifest" ] || fail MANIFEST_REQUIRED
[ -n "$output" ] || fail OUTPUT_REQUIRED
[ -f "$manifest" ] && [ -r "$manifest" ] || fail MANIFEST_UNAVAILABLE
[ ! -e "$output" ] || fail OUTPUT_EXISTS

for cmd in awk basename cat dirname mktemp mv rm sha256sum tr wc; do
  command -v "$cmd" >/dev/null 2>&1 || fail "MISSING_COMMAND_$cmd"
done

if [ -z "$parts_dir" ]; then
  parts_dir=$(dirname "$manifest")
fi
[ -d "$parts_dir" ] && [ -r "$parts_dir" ] || fail PARTS_DIR_UNAVAILABLE

output_parent=$(dirname "$output")
[ -d "$output_parent" ] && [ -w "$output_parent" ] || fail OUTPUT_PARENT_UNAVAILABLE

tmp_output=$(mktemp "$output_parent/.sandbox-ingress-unpack.XXXXXX") || fail TEMP_OUTPUT_CREATE_FAILED
cleanup() { rm -f "$tmp_output"; }
trap cleanup EXIT HUP INT TERM

TAB=$(printf '\t')
exec 3< "$manifest"

IFS="$TAB" read -r kind schema extra <&3 || fail MANIFEST_SCHEMA_MISSING
[ "$kind" = schema ] && [ "$schema" = sandbox-ingress.v1 ] && [ -z "${extra:-}" ] || fail MANIFEST_SCHEMA_INVALID

IFS="$TAB" read -r kind file_name file_size file_sha256 extra <&3 || fail MANIFEST_FILE_MISSING
[ "$kind" = file ] && [ -z "${extra:-}" ] || fail MANIFEST_FILE_INVALID
case "$file_name" in ''|.|..|*[!A-Za-z0-9._-]*) fail MANIFEST_FILENAME_INVALID ;; esac
case "$file_size" in ''|*[!0-9]*) fail MANIFEST_FILE_SIZE_INVALID ;; esac
case "$file_sha256" in ''|*[!0-9a-f]*) fail MANIFEST_FILE_SHA256_INVALID ;; esac
[ "${#file_sha256}" -eq 64 ] || fail MANIFEST_FILE_SHA256_INVALID

IFS="$TAB" read -r kind max_part_bytes extra <&3 || fail MANIFEST_MAX_PART_MISSING
[ "$kind" = max_part_bytes ] && [ -z "${extra:-}" ] || fail MANIFEST_MAX_PART_INVALID
case "$max_part_bytes" in ''|*[!0-9]*) fail MANIFEST_MAX_PART_INVALID ;; esac
[ "$max_part_bytes" -gt 0 ] || fail MANIFEST_MAX_PART_INVALID

IFS="$TAB" read -r kind part_count extra <&3 || fail MANIFEST_PART_COUNT_MISSING
[ "$kind" = part_count ] && [ -z "${extra:-}" ] || fail MANIFEST_PART_COUNT_INVALID
case "$part_count" in ''|*[!0-9]*) fail MANIFEST_PART_COUNT_INVALID ;; esac

: > "$tmp_output" || fail TEMP_OUTPUT_WRITE_FAILED
index=0
while IFS="$TAB" read -r kind declared_index part_name part_size part_sha256 extra <&3; do
  [ -n "$kind" ] || fail MANIFEST_RECORD_INVALID
  [ "$kind" = part ] && [ -z "${extra:-}" ] || fail MANIFEST_RECORD_INVALID
  expected_index=$(printf '%04d' "$index")
  [ "$declared_index" = "$expected_index" ] || fail MANIFEST_PART_INDEX_INVALID
  expected_name="$file_name.part-$expected_index"
  [ "$part_name" = "$expected_name" ] || fail MANIFEST_PART_NAME_INVALID
  case "$part_size" in ''|*[!0-9]*) fail MANIFEST_PART_SIZE_INVALID ;; esac
  [ "$part_size" -le "$max_part_bytes" ] || fail MANIFEST_PART_SIZE_INVALID
  case "$part_sha256" in ''|*[!0-9a-f]*) fail MANIFEST_PART_SHA256_INVALID ;; esac
  [ "${#part_sha256}" -eq 64 ] || fail MANIFEST_PART_SHA256_INVALID

  part_path="$parts_dir/$part_name"
  [ -f "$part_path" ] && [ -r "$part_path" ] || fail PART_MISSING
  actual_size=$(wc -c < "$part_path" | tr -d '[:space:]')
  [ "$actual_size" = "$part_size" ] || fail PART_SIZE_MISMATCH
  actual_sha256=$(sha256sum "$part_path" | awk '{print $1}')
  [ "$actual_sha256" = "$part_sha256" ] || fail PART_SHA256_MISMATCH
  cat "$part_path" >> "$tmp_output" || fail PART_APPEND_FAILED
  index=$((index + 1))
done
exec 3<&-

[ "$index" -eq "$part_count" ] || fail MANIFEST_PART_COUNT_MISMATCH

physical_count=0
for candidate in "$parts_dir/$file_name.part-"*; do
  [ -f "$candidate" ] || continue
  physical_count=$((physical_count + 1))
done
[ "$physical_count" -eq "$part_count" ] || fail UNDECLARED_PART_PRESENT

actual_file_size=$(wc -c < "$tmp_output" | tr -d '[:space:]')
[ "$actual_file_size" = "$file_size" ] || fail FILE_SIZE_MISMATCH
actual_file_sha256=$(sha256sum "$tmp_output" | awk '{print $1}')
[ "$actual_file_sha256" = "$file_sha256" ] || fail FILE_SHA256_MISMATCH

mv "$tmp_output" "$output" || fail OUTPUT_COMMIT_FAILED
trap - EXIT HUP INT TERM
printf '%s\n' "SANDBOX_INGRESS_UNPACK status=PASS file=$file_name size=$file_size sha256=$file_sha256 parts=$part_count output=$output"
