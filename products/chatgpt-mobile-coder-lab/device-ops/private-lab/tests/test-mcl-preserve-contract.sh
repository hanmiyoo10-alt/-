#!/bin/sh
set -eu

TEST_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
LAB_DIR=$(CDPATH= cd -- "$TEST_DIR/.." && pwd -P)
TOOL="$LAB_DIR/mcl-preserve"
BASE_TMP=${TMPDIR:-${TMP:-/tmp}}
[ -d "$BASE_TMP" ] || { echo 'FAIL base tmp unavailable'; exit 1; }
TMPDIR=$(mktemp -d "$BASE_TMP/mcl-preserve-contract.XXXXXX")
export TMPDIR MCL_PRESERVE_TEST_MODE=1
STATE="$TMPDIR/mcl-preserve-test-state"
ROOT="$STATE/containers/mcl-private-lab/rootfs"
PASS=0
TOTAL=0
trap 'rm -rf -- "$TMPDIR"' EXIT HUP INT TERM

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); printf 'ok %s - %s\n' "$TOTAL" "$1"; }
fail() { TOTAL=$((TOTAL + 1)); printf 'not ok %s - %s\n' "$TOTAL" "$1" >&2; exit 1; }
expect_rc() {
  expected=$1; shift
  set +e
  "$@" >"$TMPDIR/cmd.out" 2>"$TMPDIR/cmd.err"
  rc=$?
  set -e
  [ "$rc" -eq "$expected" ]
}
reset_fixture() {
  rm -rf -- "$STATE"
  mkdir -p "$ROOT/etc" \
    "$ROOT/opt/mcl-private-lab/vendor" \
    "$ROOT/opt/mcl-private-lab/fixtures" \
    "$ROOT/opt/mcl-private-lab/results" \
    "$ROOT/opt/mcl-private-lab/receipts"
  printf '%s\n' '# mcl-private-lab:v1' >"$ROOT/etc/mcl-private-lab"
  printf '%s\n' 'vendor-a' >"$ROOT/opt/mcl-private-lab/vendor/a.txt"
  printf '%s\n' 'receipt-a' >"$ROOT/opt/mcl-private-lab/receipts/a.txt"
}

capture() {
  profile=$1; name=$2
  "$TOOL" capture "$profile" >"$TMPDIR/$name"
}
compare_rc() {
  expected=$1; before=$2; after=$3
  set +e
  "$TOOL" compare "$before" "$after" >"$TMPDIR/compare.out" 2>"$TMPDIR/compare.err"
  rc=$?
  set -e
  [ "$rc" -eq "$expected" ]
}

reset_fixture
sh -n "$TOOL" && pass 'shell syntax' || fail 'shell syntax'
capture private-lab-layout layout.json
if python3 - "$TMPDIR/layout.json" <<'PY'
import json,sys
p=json.load(open(sys.argv[1]))
assert p['schema']=='repo-preservation-snapshot.v1'
assert [e['label'] for e in p['entries']]==['fixtures','private_lab_marker','receipts','results','vendor']
assert [e['kind'] for e in p['entries']]==['exists_type','file_sha256','exists_type','exists_type','exists_type']
assert all('path' not in e for e in p['entries'])
PY
then pass 'layout capture exact schema'; else fail 'layout capture exact schema'; fi

capture private-lab-content content.json
if python3 - "$TMPDIR/content.json" <<'PY'
import json,sys
p=json.load(open(sys.argv[1]))
assert p['schema']=='repo-preservation-snapshot.v1'
assert [e['label'] for e in p['entries']]==['fixtures','private_lab_marker','receipts','results','vendor']
assert [e['kind'] for e in p['entries']]==['tree_sha256','file_sha256','tree_sha256','tree_sha256','tree_sha256']
assert all('path' not in e for e in p['entries'])
assert all(('sha256' in e) for e in p['entries'])
PY
then pass 'content capture exact schema'; else fail 'content capture exact schema'; fi
capture private-lab-content same-before.json
capture private-lab-content same-after.json
if compare_rc 0 same-before.json same-after.json && grep -q '"result":"SAME"' "$TMPDIR/compare.out"; then
  pass 'identical snapshots stay SAME'
else fail 'identical snapshots stay SAME'; fi

capture private-lab-layout layout-before.json
printf '%s\n' 'content-only' >"$ROOT/opt/mcl-private-lab/vendor/content-only.txt"
capture private-lab-layout layout-after.json
if compare_rc 0 layout-before.json layout-after.json; then
  pass 'layout ignores authorized content-only change'
else fail 'layout ignores authorized content-only change'; fi

reset_fixture
capture private-lab-content add-before.json
printf '%s\n' 'new' >"$ROOT/opt/mcl-private-lab/vendor/new.txt"
capture private-lab-content add-after.json
if compare_rc 1 add-before.json add-after.json && grep -q '"result":"CHANGED"' "$TMPDIR/compare.out"; then
  pass 'content add is CHANGED'
else fail 'content add is CHANGED'; fi
reset_fixture
capture private-lab-content change-before.json
printf '%s\n' 'vendor-b' >"$ROOT/opt/mcl-private-lab/vendor/a.txt"
capture private-lab-content change-after.json
if compare_rc 1 change-before.json change-after.json; then
  pass 'content modification is CHANGED'
else fail 'content modification is CHANGED'; fi

reset_fixture
capture private-lab-content remove-before.json
rm -f "$ROOT/opt/mcl-private-lab/vendor/a.txt"
capture private-lab-content remove-after.json
if compare_rc 1 remove-before.json remove-after.json; then
  pass 'content removal is CHANGED'
else fail 'content removal is CHANGED'; fi

reset_fixture
capture private-lab-layout marker-layout-before.json
capture private-lab-content marker-content-before.json
printf '%s\n' '# mcl-private-lab:changed' >"$ROOT/etc/mcl-private-lab"
capture private-lab-layout marker-layout-after.json
capture private-lab-content marker-content-after.json
if compare_rc 1 marker-layout-before.json marker-layout-after.json && compare_rc 1 marker-content-before.json marker-content-after.json; then
  pass 'marker change is detected by both profiles'
else fail 'marker change is detected by both profiles'; fi
reset_fixture
ln -s a.txt "$ROOT/opt/mcl-private-lab/vendor/link.txt"
if expect_rc 2 "$TOOL" capture private-lab-content; then
  pass 'tree symlink stays BLOCKED'
else fail 'tree symlink stays BLOCKED'; fi

reset_fixture
mkfifo "$ROOT/opt/mcl-private-lab/vendor/fifo"
if expect_rc 2 "$TOOL" capture private-lab-content; then
  pass 'special file stays BLOCKED'
else fail 'special file stays BLOCKED'; fi

reset_fixture
python3 - "$ROOT/opt/mcl-private-lab/vendor/huge.bin" <<'PY'
from pathlib import Path
import sys
with open(sys.argv[1], 'wb') as f:
    f.truncate(536870913)
PY
if expect_rc 2 "$TOOL" capture private-lab-content; then
  pass 'common byte ceiling stays BLOCKED'
else fail 'common byte ceiling stays BLOCKED'; fi
reset_fixture
capture private-lab-content safe-before.json
capture private-lab-content safe-after.json
ln -s safe-before.json "$TMPDIR/link.json"
mkdir "$TMPDIR/dir.json"
if expect_rc 2 "$TOOL" compare ../safe-before.json safe-after.json && \
   expect_rc 2 "$TOOL" compare sub/safe-before.json safe-after.json && \
   expect_rc 2 "$TOOL" compare link.json safe-after.json && \
   expect_rc 2 "$TOOL" compare dir.json safe-after.json; then
  pass 'compare rejects traversal slash symlink and non-regular inputs'
else fail 'compare rejects traversal slash symlink and non-regular inputs'; fi

printf '%s\n' '{not-json' >"$TMPDIR/bad.json"
if expect_rc 2 "$TOOL" compare bad.json safe-after.json && grep -q '"result":"BLOCKED"' "$TMPDIR/cmd.out"; then
  pass 'common compare BLOCKED is preserved'
else fail 'common compare BLOCKED is preserved'; fi

set +e
( unset TMPDIR; MCL_PRESERVE_TEST_MODE=1 "$TOOL" capture private-lab-layout ) >"$BASE_TMP/mcl-preserve-no-tmp.out" 2>"$BASE_TMP/mcl-preserve-no-tmp.err"
rc=$?
set -e
rm -f "$BASE_TMP/mcl-preserve-no-tmp.out" "$BASE_TMP/mcl-preserve-no-tmp.err"
[ "$rc" -eq 2 ] && pass 'missing TMPDIR blocks' || fail 'missing TMPDIR blocks'
NOWRITE="$TMPDIR/no-write"
mkdir "$NOWRITE"
chmod 500 "$NOWRITE"
set +e
TMPDIR="$NOWRITE" MCL_PRESERVE_TEST_MODE=1 "$TOOL" capture private-lab-layout >/dev/null 2>&1
rc=$?
set -e
chmod 700 "$NOWRITE"
[ "$rc" -eq 2 ] && pass 'unwritable TMPDIR blocks' || fail 'unwritable TMPDIR blocks'

reset_fixture
rm -f "$TMPDIR"/mcl-preserve.capture.*
capture private-lab-content cleanup-success.json
success_residue=$(find "$TMPDIR" -maxdepth 1 -name 'mcl-preserve.capture.*' -print | wc -l | tr -d ' ')
ln -s a.txt "$ROOT/opt/mcl-private-lab/vendor/link-again.txt"
expect_rc 2 "$TOOL" capture private-lab-content || fail 'failure setup returns BLOCKED'
failure_residue=$(find "$TMPDIR" -maxdepth 1 -name 'mcl-preserve.capture.*' -print | wc -l | tr -d ' ')
if [ "$success_residue" = 0 ] && [ "$failure_residue" = 0 ]; then
  pass 'temporary capture file leaves zero residue'
else fail 'temporary capture file leaves zero residue'; fi

if expect_rc 2 "$TOOL" capture arbitrary-profile && \
   expect_rc 2 "$TOOL" capture private-lab-layout extra && \
   expect_rc 2 "$TOOL" compare safe-before.json safe-after.json extra; then
  pass 'CLI rejects arbitrary profile and extra passthrough'
else fail 'CLI rejects arbitrary profile and extra passthrough'; fi
if grep -Fq 'MCL_PRIVATE_LAB_STATE_BASE' "$TOOL" || \
   grep -Fq 'PREFIX=${' "$TOOL" || \
   grep -Eq 'eval|sh -c|bash -c' "$TOOL"; then
  fail 'arbitrary root environment and shell passthrough absent'
else
  pass 'arbitrary root environment and shell passthrough absent'
fi

reset_fixture
capture private-lab-layout bounded.json
line_count=$(wc -l <"$TMPDIR/bounded.json" | tr -d ' ')
if [ "$line_count" = 1 ] && \
   grep -q '^{' "$TMPDIR/bounded.json" && \
   ! grep -Eiq 'whole[- ]?m|m preserved|device healthy' "$TMPDIR/bounded.json"; then
  pass 'capture emits only bounded common snapshot evidence'
else fail 'capture emits only bounded common snapshot evidence'; fi

chmod 755 "$TOOL" "$0"
printf 'PASS %s/%s mcl-preserve contract\n' "$PASS" "$TOTAL"
