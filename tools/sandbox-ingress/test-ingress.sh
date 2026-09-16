#!/bin/sh
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
pack="$here/pack.sh"
unpack="$here/unpack.sh"
work=$(mktemp -d "${TMPDIR:-/tmp}/sandbox-ingress-test.XXXXXX")
cleanup() { rm -rf "$work"; }
trap cleanup EXIT HUP INT TERM

fail() {
  echo "SANDBOX_INGRESS_TEST status=FAIL reason=$1"
  exit 1
}

expect_fail() {
  reason=$1
  shift
  log="$work/fail.log"
  if "$@" >"$log" 2>&1; then
    fail "EXPECTED_FAILURE_$reason"
  fi
  grep -F "reason=$reason" "$log" >/dev/null 2>&1 || {
    cat "$log" >&2
    fail "WRONG_FAILURE_$reason"
  }
}

printf 'abcdefghijklmnopqrstuvwxyz\n' > "$work/multi.bin"
"$pack" --input "$work/multi.bin" --output-dir "$work/multi.pack" --max-part-bytes 7 >/dev/null
[ "$(find "$work/multi.pack" -type f -name 'multi.bin.part-*' | wc -l | tr -d '[:space:]')" -eq 4 ] || fail MULTI_PART_COUNT
"$unpack" --manifest "$work/multi.pack/manifest.tsv" --output "$work/multi.out" >/dev/null
cmp "$work/multi.bin" "$work/multi.out" >/dev/null || fail MULTI_ROUNDTRIP

printf 'single-part\n' > "$work/single.bin"
"$pack" --input "$work/single.bin" --output-dir "$work/single.pack" --max-part-bytes 1024 >/dev/null
[ "$(find "$work/single.pack" -type f -name 'single.bin.part-*' | wc -l | tr -d '[:space:]')" -eq 1 ] || fail SINGLE_PART_COUNT
"$unpack" --manifest "$work/single.pack/manifest.tsv" --output "$work/single.out" >/dev/null
cmp "$work/single.bin" "$work/single.out" >/dev/null || fail SINGLE_ROUNDTRIP

cp -R "$work/multi.pack" "$work/missing.pack"
rm "$work/missing.pack/multi.bin.part-0001"
expect_fail PART_MISSING "$unpack" --manifest "$work/missing.pack/manifest.tsv" --output "$work/missing.out"
[ ! -e "$work/missing.out" ] || fail MISSING_EXPOSED_OUTPUT

cp -R "$work/multi.pack" "$work/tamper.pack"
printf 'X' | dd of="$work/tamper.pack/multi.bin.part-0001" bs=1 seek=0 conv=notrunc 2>/dev/null
expect_fail PART_SHA256_MISMATCH "$unpack" --manifest "$work/tamper.pack/manifest.tsv" --output "$work/tamper.out"
[ ! -e "$work/tamper.out" ] || fail TAMPER_EXPOSED_OUTPUT

cp -R "$work/multi.pack" "$work/size.pack"
printf 'X' >> "$work/size.pack/multi.bin.part-0001"
expect_fail PART_SIZE_MISMATCH "$unpack" --manifest "$work/size.pack/manifest.tsv" --output "$work/size.out"

cp -R "$work/multi.pack" "$work/renamed.pack"
mv "$work/renamed.pack/multi.bin.part-0000" "$work/renamed.pack/multi.bin.part-renamed"
expect_fail PART_MISSING "$unpack" --manifest "$work/renamed.pack/manifest.tsv" --output "$work/renamed.out"

cp -R "$work/multi.pack" "$work/duplicate.pack"
awk '1; /^part\t0000\t/ {print}' "$work/duplicate.pack/manifest.tsv" > "$work/duplicate.pack/manifest.tmp"
mv "$work/duplicate.pack/manifest.tmp" "$work/duplicate.pack/manifest.tsv"
expect_fail MANIFEST_PART_INDEX_INVALID "$unpack" --manifest "$work/duplicate.pack/manifest.tsv" --output "$work/duplicate.out"

cp -R "$work/multi.pack" "$work/extra.pack"
cp "$work/extra.pack/multi.bin.part-0000" "$work/extra.pack/multi.bin.part-9999"
expect_fail UNDECLARED_PART_PRESENT "$unpack" --manifest "$work/extra.pack/manifest.tsv" --output "$work/extra.out"

cp -R "$work/multi.pack" "$work/invalid.pack"
sed '1s/sandbox-ingress.v1/sandbox-ingress.v0/' "$work/invalid.pack/manifest.tsv" > "$work/invalid.pack/manifest.tmp"
mv "$work/invalid.pack/manifest.tmp" "$work/invalid.pack/manifest.tsv"
expect_fail MANIFEST_SCHEMA_INVALID "$unpack" --manifest "$work/invalid.pack/manifest.tsv" --output "$work/invalid.out"

if find "$work" -type f -name '.sandbox-ingress-unpack.*' | grep . >/dev/null 2>&1; then
  fail TEMP_OUTPUT_LEAK
fi

printf '%s\n' 'SANDBOX_INGRESS_TEST status=PASS cases=single,multi,missing,tamper,size,renamed,duplicate,extra,manifest-invalid'
