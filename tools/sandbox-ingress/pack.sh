#!/bin/sh
set -eu

input=
output_dir=
max_part_bytes=

usage() {
  echo "usage: $0 --input FILE --output-dir DIR --max-part-bytes N" >&2
}

fail() {
  echo "SANDBOX_INGRESS_PACK status=FAIL reason=$1"
  exit 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --input)
      [ "$#" -ge 2 ] || { usage; fail MISSING_INPUT_VALUE; }
      input=$2
      shift 2
      ;;
    --output-dir)
      [ "$#" -ge 2 ] || { usage; fail MISSING_OUTPUT_DIR_VALUE; }
      output_dir=$2
      shift 2
      ;;
    --max-part-bytes)
      [ "$#" -ge 2 ] || { usage; fail MISSING_MAX_PART_BYTES_VALUE; }
      max_part_bytes=$2
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

[ -n "$input" ] || fail INPUT_REQUIRED
[ -n "$output_dir" ] || fail OUTPUT_DIR_REQUIRED
case "$max_part_bytes" in
  ''|*[!0-9]*) fail INVALID_MAX_PART_BYTES ;;
esac
[ "$max_part_bytes" -gt 0 ] || fail INVALID_MAX_PART_BYTES
[ -f "$input" ] && [ -r "$input" ] || fail INPUT_UNAVAILABLE
[ ! -e "$output_dir" ] || fail OUTPUT_DIR_EXISTS

for cmd in awk basename dirname mktemp sha256sum split tr wc mv rm; do
  command -v "$cmd" >/dev/null 2>&1 || fail "MISSING_COMMAND_$cmd"
done

file_name=$(basename "$input")
case "$file_name" in
  ''|.|..|*[!A-Za-z0-9._-]*) fail UNSAFE_INPUT_FILENAME ;;
esac

parent=$(dirname "$output_dir")
[ -d "$parent" ] && [ -w "$parent" ] || fail OUTPUT_PARENT_UNAVAILABLE

tmp_dir=$(mktemp -d "$parent/.sandbox-ingress-pack.XXXXXX") || fail TEMP_DIR_CREATE_FAILED
cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT HUP INT TERM

prefix="$tmp_dir/$file_name.part-"
split -b "$max_part_bytes" -d -a 4 "$input" "$prefix" || fail SPLIT_FAILED

file_size=$(wc -c < "$input" | tr -d '[:space:]')
file_sha256=$(sha256sum "$input" | awk '{print $1}')
case "$file_size" in ''|*[!0-9]*) fail INPUT_SIZE_INVALID ;; esac
case "$file_sha256" in ''|*[!0-9a-f]*) fail INPUT_SHA256_INVALID ;; esac
[ "${#file_sha256}" -eq 64 ] || fail INPUT_SHA256_INVALID

manifest="$tmp_dir/manifest.tsv"
part_count=0
{
  printf 'schema\tsandbox-ingress.v1\n'
  printf 'file\t%s\t%s\t%s\n' "$file_name" "$file_size" "$file_sha256"
  printf 'max_part_bytes\t%s\n' "$max_part_bytes"
  for part in "$prefix"*; do
    [ -f "$part" ] || continue
    part_count=$((part_count + 1))
  done
  printf 'part_count\t%s\n' "$part_count"

  index=0
  for part in "$prefix"*; do
    [ -f "$part" ] || continue
    suffix=$(printf '%04d' "$index")
    expected_name="$file_name.part-$suffix"
    actual_name=$(basename "$part")
    [ "$actual_name" = "$expected_name" ] || fail NONDETERMINISTIC_PART_NAME
    part_size=$(wc -c < "$part" | tr -d '[:space:]')
    part_sha256=$(sha256sum "$part" | awk '{print $1}')
    printf 'part\t%s\t%s\t%s\t%s\n' "$suffix" "$actual_name" "$part_size" "$part_sha256"
    index=$((index + 1))
  done
} > "$manifest" || fail MANIFEST_WRITE_FAILED

mv "$tmp_dir" "$output_dir" || fail OUTPUT_COMMIT_FAILED
trap - EXIT HUP INT TERM
printf '%s\n' "SANDBOX_INGRESS_PACK status=PASS file=$file_name size=$file_size sha256=$file_sha256 parts=$part_count max_part_bytes=$max_part_bytes output_dir=$output_dir"
