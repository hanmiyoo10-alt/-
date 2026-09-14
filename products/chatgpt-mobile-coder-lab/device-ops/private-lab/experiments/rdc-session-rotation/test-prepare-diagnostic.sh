#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
PREP="$HERE/prepare.sh"
PROBE="$HERE/probe.mjs"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
PASS=0
ok() { PASS=$((PASS + 1)); echo "ok $PASS - $1"; }
fail() { echo "not ok - $1" >&2; exit 1; }

ROOT="$TMP/mock"
LABROOT="$ROOT/lab"
LOG="$ROOT/pd.log"
mkdir -p "$ROOT"
cat > "$ROOT/proot-distro" <<'MOCK'
#!/bin/sh
set -eu
LOG=${MOCK_DIAG_LOG:?}
LABROOT=${MOCK_LAB_ROOT:?}
MODE=${MOCK_DIAG_MODE:-pass}
printf '%s\n' "$*" >> "$LOG"
[ "$1" = login ] && [ "$2" = --isolated ] && [ "$3" = mcl-private-lab ] && [ "$4" = -- ] || exit 60
script=${7:-}
case "$script" in
  *mcl-rdc-rotation-repro:check:v1*)
    target="$LABROOT/opt/mcl-private-lab/vendor/rdc-session-rotation"
    marker="$target/.mcl-rdc-rotation-repro-v1"
    pkg="$target/node_modules/@wonderwhy-er/desktop-commander/package.json"
    probe="$target/probe.mjs"
    if [ ! -e "$target" ]; then echo "MISSING vendor:0.2.50"; exit 0; fi
    [ -d "$target" ] || { echo "BLOCKED vendor:unmanaged"; exit 1; }
    [ -f "$marker" ] && grep -Fxq "mcl-rdc-rotation-repro:v1" "$marker" || { echo "BLOCKED vendor:unmanaged"; exit 1; }
    [ -f "$pkg" ] && grep -Fq '"version": "0.2.50"' "$pkg" || { echo "BLOCKED vendor:version"; exit 1; }
    [ -f "$probe" ] || { echo "BLOCKED vendor:probe"; exit 1; }
    echo "PRESENT vendor:0.2.50" ;;
  *mcl-rdc-rotation-repro:stage-probe:v1*)
    mapped=$(printf '%s\n' "$script" | sed "s#/opt/mcl-private-lab#$LABROOT/opt/mcl-private-lab#g")
    sh -c "$mapped" ;;
  *mcl-rdc-rotation-repro:install:v1*)
    echo PRIVATE_CHILD_STDOUT
    echo PRIVATE_CHILD_STDERR >&2
    record="$LABROOT/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage/.mcl-rdc-rotation-classifier-v1"
    write_record() { printf '%s\n' "$1" > "$record"; }
    case "$MODE" in
      precondition_fail) write_record install_precondition_failed; exit 71 ;;
      workspace_fail) write_record workspace_failed; exit 71 ;;
      package_install_fail) write_record package_install_failed; exit 71 ;;
      package_archive_fail) write_record package_archive_failed; exit 71 ;;
      package_extract_fail) write_record package_extract_failed; exit 71 ;;
      package_identity_fail) write_record package_identity_failed; exit 71 ;;
      materialize_fail) write_record materialize_failed; exit 71 ;;
      publish_fail) write_record publish_failed; exit 71 ;;
      entry_fail) exit 71 ;;
      unexpected_record) printf '%s\n' unexpected_child_value > "$record"; exit 71 ;;
      oversize_record) printf '%040d\n' 0 > "$record"; exit 71 ;;
      multiline_record) printf '%s\n%s\n' workspace_failed publish_failed > "$record"; exit 71 ;;
      symlink_record) ln -s "$LABROOT/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage/probe.mjs" "$record"; exit 71 ;;
      workspace_fail_fd3_noise) write_record workspace_failed; (printf '%s\n' unexpected_fd3_value >&3) 2>/dev/null || true; exit 71 ;;
      identity_exec_exact|identity_exec_wrong)
        fixture="$LABROOT/identity-fixture"
        pkgroot="$fixture/node_modules/@wonderwhy-er/desktop-commander"
        mkdir -p "$pkgroot"
        if [ "$MODE" = identity_exec_exact ]; then version=0.2.50; else version=0.2.49; fi
        printf '%s\n' "{\"version\": \"$version\"}" > "$pkgroot/package.json"
        identity_script="$fixture/identity.sh"
        {
          printf '%s\n' '#!/bin/sh' 'set -eu'
          printf '%s\n' 'pkg_root=${IDENTITY_PKG_ROOT:?}' 'record=${IDENTITY_RECORD:?}'
          printf '%s\n' 'milestone() {' '  [ "$1" = package_identity_failed ] || exit 90' '  printf "%s\\n" "$1" > "$record"' '  exit 71' '}'
          printf '%s\n' "$script" | sed -n '/^pkg=\$pkg_root\/package.json$/ {p;n;p;q;}'
        } > "$identity_script"
        [ "$(grep -c '^pkg=\$pkg_root/package.json$\|package_identity_failed$' "$identity_script")" -eq 2 ] || exit 91
        export IDENTITY_PKG_ROOT="$pkgroot" IDENTITY_RECORD="$record"
        if /bin/sh "$identity_script" </dev/null; then
          [ "$MODE" = identity_exec_exact ] || exit 92
          target="$LABROOT/opt/mcl-private-lab/vendor/rdc-session-rotation"
          stage="$LABROOT/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage"
          target_pkg="$target/node_modules/@wonderwhy-er/desktop-commander"
          mkdir -p "$target_pkg/dist/remote-device"
          cp "$stage/probe.mjs" "$target/probe.mjs"
          cp "$pkgroot/package.json" "$target_pkg/package.json"
          printf '%s\n' 'mock exact package source' > "$target_pkg/dist/remote-device/device.js"
          printf '%s\n' 'mcl-rdc-rotation-repro:v1' > "$target/.mcl-rdc-rotation-repro-v1"
          rm -rf "$stage"
          exit 0
        else
          exit $?
        fi ;;
      archive_success)
        target="$LABROOT/opt/mcl-private-lab/vendor/rdc-session-rotation"
        stage="$LABROOT/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage"
        pkgroot="$target/node_modules/@wonderwhy-er/desktop-commander"
        mkdir -p "$pkgroot/dist/remote-device"
        cp "$stage/probe.mjs" "$target/probe.mjs"
        printf '%s\n' 'mcl-rdc-rotation-repro:v1' > "$target/.mcl-rdc-rotation-repro-v1"
        printf '%s\n' '{"name":"@wonderwhy-er/desktop-commander","version": "0.2.50"}' > "$pkgroot/package.json"
        printf '%s\n' 'mock exact package source' > "$pkgroot/dist/remote-device/device.js"
        rm -rf "$stage"
        exit 0 ;;
      verify_fail)
        target="$LABROOT/opt/mcl-private-lab/vendor/rdc-session-rotation"
        stage="$LABROOT/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage"
        mkdir -p "$target/node_modules/@wonderwhy-er/desktop-commander"
        cp "$stage/probe.mjs" "$target/probe.mjs"
        printf '%s\n' 'mcl-rdc-rotation-repro:v1' > "$target/.mcl-rdc-rotation-repro-v1"
        printf '%s\n' '{"version": "0.2.49"}' > "$target/node_modules/@wonderwhy-er/desktop-commander/package.json"
        rm -rf "$stage"
        exit 0 ;;
      *) exit 61 ;;
    esac ;;
  *mcl-rdc-rotation-repro:lab-probe:v1*)
    echo PRIVATE_CHILD_STDOUT
    echo PRIVATE_CHILD_STDERR >&2
    [ "$MODE" != lab_fail ] ;;
  *mcl-rdc-rotation-repro:inspect-stage:v1*|*mcl-rdc-rotation-repro:cleanup-stage:v1*|*mcl-rdc-rotation-repro:read-install-classifier:v1*)
    mapped=$(printf '%s\n' "$script" | sed "s#/opt/mcl-private-lab#$LABROOT/opt/mcl-private-lab#g")
    sh -c "$mapped" ;;
  *mcl-rdc-rotation-repro:npm-probe:v1*)
    echo PRIVATE_CHILD_STDOUT
    echo PRIVATE_CHILD_STDERR >&2
    [ "$MODE" != npm_fail ] ;;
  *mcl-rdc-rotation-repro:network-probe:v1*)
    echo PRIVATE_CHILD_STDOUT
    echo PRIVATE_CHILD_STDERR >&2
    [ "$MODE" != network_fail ] ;;
  *mcl-rdc-rotation-repro:package-probe:v1*)
    echo PRIVATE_CHILD_STDOUT
    echo PRIVATE_CHILD_STDERR >&2
    [ "$MODE" != package_fail ] ;;
  *) exit 61 ;;
esac
MOCK
chmod 755 "$ROOT/proot-distro"
export MCL_ROTATION_PREPARE_TEST_MODE=1
export MCL_ROTATION_PREPARE_TEST_ROOT="$ROOT"
export MOCK_DIAG_LOG="$LOG"
export MOCK_LAB_ROOT="$LABROOT"
export MOCK_DIAG_MODE=pass

reset_lab() {
  rm -rf "$LABROOT"
  mkdir -p "$LABROOT/opt/mcl-private-lab/vendor"
  : > "$LOG"
  export MOCK_DIAG_MODE=pass
}
stage_path() { printf '%s' "$LABROOT/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage"; }
target_path() { printf '%s' "$LABROOT/opt/mcl-private-lab/vendor/rdc-session-rotation"; }
legacy_stage() { s=$(stage_path); mkdir -p "$s"; cp "$PROBE" "$s/probe.mjs"; }
marked_stage() { legacy_stage; printf '%s\n' 'mcl-rdc-rotation-stage:v1' > "$(stage_path)/.mcl-rdc-rotation-stage-v1"; }
classifier_path() { printf '%s' "$(stage_path)/.mcl-rdc-rotation-classifier-v1"; }
write_classifier() { printf '%s\n' "$1" > "$(classifier_path)"; }
expected_diag() {
  printf '%s\n' \
    'schema=mcl-private-prepare-diagnostic.v1' \
    'check=rdc-rotation-prepare' \
    "result=$1" \
    "class=$2" \
    "staging=$3" \
    'details=withheld'
}

reset_lab
export MCL_ROTATION_PREPARE_TEST_VALIDATE=1
export MCL_ROTATION_PREPARE_TEST_CANDIDATE="$(expected_diag pass ready none)"
out=$("$PREP")
[ "$out" = "$(expected_diag pass ready none)" ] || fail "valid diagnostic rejected"
for bad in \
  "$(expected_diag pass ready none)\nextra=leak" \
  "schema=mcl-private-prepare-diagnostic.v1\ncheck=rdc-rotation-prepare\nresult=pass\nclass=ready\nclass=ready\nstaging=none\ndetails=withheld" \
  "schema=mcl-private-prepare-diagnostic.v1\ncheck=rdc-rotation-prepare\nresult=pass\nclass=freeform-error\nstaging=none\ndetails=withheld" \
  "schema=mcl-private-prepare-diagnostic.v1\ncheck=rdc-rotation-prepare\nresult=pass\nclass=ready\nstaging=none"; do
  export MCL_ROTATION_PREPARE_TEST_CANDIDATE=$(printf '%b' "$bad")
  if out=$("$PREP"); then fail "malformed diagnostic accepted"; fi
  [ -z "$out" ] || fail "malformed diagnostic leaked outward"
done
unset MCL_ROTATION_PREPARE_TEST_VALIDATE MCL_ROTATION_PREPARE_TEST_CANDIDATE
ok "strict diagnostic validator accepts only the six-field enum schema"

reset_lab
out=$("$PREP" --diagnose)
[ "$out" = "$(expected_diag pass ready none)" ] || fail "empty-stage diagnose mismatch"
printf '%s\n' "$out" | grep -Fq PRIVATE_CHILD && fail "child output leaked"
! grep -Fq 'mcl-rdc-rotation-repro:install:v1' "$LOG" || fail "diagnose attempted install"
ok "diagnose reports ready without installing or forwarding child output"

reset_lab
legacy_stage
out=$("$PREP" --diagnose)
[ "$out" = "$(expected_diag pass ready cleanup_eligible)" ] || fail "legacy stage not eligible"
ok "exact legacy one-file stage is cleanup eligible by content identity"

reset_lab
marked_stage
out=$("$PREP" --diagnose)
[ "$out" = "$(expected_diag pass ready cleanup_eligible)" ] || fail "marked stage not eligible"
ok "future exact marked stage is cleanup eligible"

reset_lab
mkdir -p "$LABROOT/elsewhere"
ln -s "$LABROOT/elsewhere" "$(stage_path)"
if out=$("$PREP" --diagnose); then fail "symlink stage exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "symlink stage classification mismatch"
ok "symlink staging fails closed"

reset_lab
legacy_stage
printf x > "$(stage_path)/extra"
if out=$("$PREP" --diagnose); then fail "extra file exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "extra file classification mismatch"
ok "unexpected extra file makes staging conflict"

reset_lab
legacy_stage
mkdir "$(stage_path)/extra-dir"
if out=$("$PREP" --diagnose); then fail "extra dir exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "extra dir classification mismatch"
ok "unexpected subdirectory makes staging conflict"

reset_lab
legacy_stage
printf '%s\n' wrong > "$(stage_path)/probe.mjs"
if out=$("$PREP" --diagnose); then fail "wrong probe exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "wrong probe classification mismatch"
ok "wrong probe bytes fail exact ownership proof"

reset_lab
mkdir -p "$(target_path)"
if out=$("$PREP" --diagnose); then fail "target-present diagnose exited zero"; fi
[ "$out" = "$(expected_diag blocked target_conflict conflict)" ] || fail "target-present classification mismatch"
ok "existing target blocks diagnostic cleanup ownership"

reset_lab
export MOCK_DIAG_MODE=npm_fail
if out=$("$PREP" --diagnose); then fail "npm failure exited zero"; fi
[ "$out" = "$(expected_diag blocked npm_unavailable none)" ] || fail "npm class mismatch"
ok "npm availability is a fixed coarse class"

reset_lab
export MOCK_DIAG_MODE=network_fail
if out=$("$PREP" --diagnose); then fail "network failure exited zero"; fi
[ "$out" = "$(expected_diag blocked network_unavailable none)" ] || fail "network class mismatch"
ok "network availability is classified without raw output"

reset_lab
export MOCK_DIAG_MODE=package_fail
if out=$("$PREP" --diagnose); then fail "package failure exited zero"; fi
[ "$out" = "$(expected_diag blocked package_unavailable none)" ] || fail "package class mismatch"
ok "package availability is classified without package-manager logs"

reset_lab
export MOCK_DIAG_MODE=lab_fail
if out=$("$PREP" --diagnose); then fail "lab failure exited zero"; fi
[ "$out" = "$(expected_diag blocked lab_unavailable conflict)" ] || fail "lab class mismatch"
ok "unavailable isolated lab fails closed without staging claims"

reset_lab
legacy_stage
out=$("$PREP" --cleanup)
[ "$out" = "$(expected_diag pass ready none)" ] || fail "legacy cleanup receipt mismatch"
[ ! -e "$(stage_path)" ] && [ ! -L "$(stage_path)" ] || fail "legacy stage not removed"
[ ! -e "$(target_path)" ] || fail "cleanup created target"
! grep -Fq 'mcl-rdc-rotation-repro:install:v1' "$LOG" || fail "cleanup attempted install"
ok "cleanup removes only exact legacy packet-owned stage"

reset_lab
marked_stage
out=$("$PREP" --cleanup)
[ "$out" = "$(expected_diag pass ready none)" ] || fail "marked cleanup receipt mismatch"
[ ! -e "$(stage_path)" ] || fail "marked stage not removed"
ok "cleanup removes exact future marked stage"

reset_lab
marked_stage
write_classifier package_install_failed
out=$("$PREP" --cleanup)
[ "$out" = "$(expected_diag pass ready none)" ] || fail "classified cleanup receipt mismatch"
[ ! -e "$(stage_path)" ] || fail "classified stage not removed"
ok "cleanup accepts only exact allowlisted classifier record shape"

reset_lab
legacy_stage
printf x > "$(stage_path)/extra"
if out=$("$PREP" --cleanup); then fail "conflicting cleanup exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "conflicting cleanup receipt mismatch"
[ -e "$(stage_path)/extra" ] || fail "conflicting stage was mutated"
ok "cleanup preserves staging when exact ownership is not proven"

reset_lab
out=$("$PREP" --cleanup)
[ "$out" = "$(expected_diag pass ready none)" ] || fail "absent cleanup receipt mismatch"
ok "cleanup is idempotent when staging is absent"

reset_lab
marked_stage
err="$TMP/apply-precondition.err"
: > "$err"
if out=$("$PREP" --apply 2>"$err"); then fail "pre-existing stage apply exited zero"; fi
[ "$out" = "$(expected_diag unknown unknown cleanup_eligible)" ] || fail "precondition failure classification mismatch"
[ -e "$(stage_path)/probe.mjs" ] || fail "precondition failure auto-cleaned staging"
! grep -Fq 'mcl-rdc-rotation-repro:install:v1' "$LOG" || fail "precondition failure attempted install"
[ ! -s "$err" ] || fail "precondition failure leaked stderr"
ok "apply precondition failure preserves exact staging without inventing install failure"

reset_lab
legacy_stage
printf x > "$(stage_path)/extra"
err="$TMP/apply-conflict.err"
: > "$err"
if out=$("$PREP" --apply 2>"$err"); then fail "conflicting stage apply exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "apply stage-conflict classification mismatch"
[ -e "$(stage_path)/extra" ] || fail "apply stage conflict mutated staging"
! grep -Fq 'mcl-rdc-rotation-repro:install:v1' "$LOG" || fail "apply stage conflict attempted install"
[ ! -s "$err" ] || fail "apply stage conflict leaked stderr"
ok "apply stage conflict fails closed before install"

reset_lab
export MOCK_DIAG_MODE=entry_fail
err="$TMP/entry-fail.err"
: > "$err"
if out=$("$PREP" --apply 2>"$err"); then fail "install entry failure exited zero"; fi
[ "$out" = "$(expected_diag blocked install_entry_failed cleanup_eligible)" ] || fail "install entry failure classification mismatch"
[ -e "$(stage_path)/probe.mjs" ] || fail "install entry failure auto-cleaned staging"
[ ! -e "$(target_path)" ] || fail "install entry failure created target"
printf '%s\n' "$out" | grep -Fq PRIVATE_CHILD && fail "install entry child stdout leaked"
grep -Fq PRIVATE_CHILD "$err" && fail "install entry child stderr leaked"
ok "empty install entry failure emits only sanitized install_entry_failed and preserves staging"

reset_lab
marked_stage
write_classifier workspace_failed
out=$("$PREP" --diagnose)
[ "$out" = "$(expected_diag pass ready cleanup_eligible)" ] || fail "classified stage not cleanup eligible"
ok "exact allowlisted classifier record remains packet-owned cleanup state"

for mode in unexpected_record oversize_record multiline_record symlink_record; do
  reset_lab
  export MOCK_DIAG_MODE=$mode
  err="$TMP/$mode.err"
  : > "$err"
  if out=$("$PREP" --apply 2>"$err"); then fail "$mode exited zero"; fi
  [ "$out" = "$(expected_diag blocked install_failed conflict)" ] || fail "$mode fail-closed classification mismatch"
  [ -e "$(stage_path)/probe.mjs" ] || fail "$mode auto-cleaned staging"
  [ ! -e "$(target_path)" ] || fail "$mode created target"
  printf '%s\n' "$out" | grep -Fq PRIVATE_CHILD && fail "$mode child stdout leaked"
  grep -Fq PRIVATE_CHILD "$err" && fail "$mode child stderr leaked"
  ok "$mode cannot escape fixed classifier vocabulary"
done

reset_lab
export MOCK_DIAG_MODE=workspace_fail_fd3_noise
fd3="$TMP/fd3-noise.capture"
: > "$fd3"
err="$TMP/fd3-noise.err"
: > "$err"
if out=$("$PREP" --apply 3>"$fd3" 2>"$err"); then fail "fd3-noise fixture exited zero"; fi
[ "$out" = "$(expected_diag blocked workspace_failed cleanup_eligible)" ] || fail "fd3 noise changed classifier semantics"
[ ! -s "$fd3" ] || fail "install command inherited caller fd3"
[ ! -s "$err" ] || fail "fd3-noise fixture leaked stderr"
ok "classifier record is authoritative and install fd3 is explicitly closed"

for spec in \
  precondition_fail:install_precondition_failed \
  workspace_fail:workspace_failed \
  package_install_fail:package_install_failed \
  package_archive_fail:package_archive_failed \
  package_extract_fail:package_extract_failed \
  package_identity_fail:package_identity_failed \
  materialize_fail:materialize_failed \
  publish_fail:publish_failed; do
  mode=${spec%%:*}
  class=${spec#*:}
  reset_lab
  export MOCK_DIAG_MODE=$mode
  err="$TMP/$mode.err"
  : > "$err"
  if out=$("$PREP" --apply 2>"$err"); then fail "$class exited zero"; fi
  [ "$out" = "$(expected_diag blocked "$class" cleanup_eligible)" ] || fail "$class classification mismatch"
  [ -e "$(stage_path)/probe.mjs" ] || fail "$class auto-cleaned staging"
  [ ! -e "$(target_path)" ] || fail "$class created target"
  printf '%s\n' "$out" | grep -Fq PRIVATE_CHILD && fail "$class child stdout leaked"
  grep -Fq PRIVATE_CHILD "$err" && fail "$class child stderr leaked"
  ok "$class is independently sanitized and preserves staging"
done

reset_lab
export MOCK_DIAG_MODE=identity_exec_exact
err="$TMP/identity-exact.err"
: > "$err"
out=$("$PREP" --apply </dev/null 2>"$err")
[ "$out" = 'INSTALLED vendor:0.2.50' ] || fail "exact identity payload did not terminate and install"
[ ! -s "$err" ] || fail "exact identity payload leaked stderr"
ok "actual install identity payload terminates and accepts exact version without stdin"

reset_lab
export MOCK_DIAG_MODE=identity_exec_wrong
err="$TMP/identity-wrong.err"
: > "$err"
if out=$("$PREP" --apply </dev/null 2>"$err"); then fail "wrong identity payload exited zero"; fi
[ "$out" = "$(expected_diag blocked package_identity_failed cleanup_eligible)" ] || fail "wrong identity payload classification mismatch"
[ ! -s "$err" ] || fail "wrong identity payload leaked stderr"
ok "actual install identity payload terminates and maps wrong version to package_identity_failed"

reset_lab
export MOCK_DIAG_MODE=archive_success
err="$TMP/archive-success.err"
: > "$err"
out=$("$PREP" --apply 2>"$err")
[ "$out" = 'INSTALLED vendor:0.2.50' ] || fail "package-only apply success output mismatch"
[ ! -s "$err" ] || fail "package-only apply success leaked stderr"
target=$(target_path)
pkgroot="$target/node_modules/@wonderwhy-er/desktop-commander"
[ -f "$pkgroot/package.json" ] || fail "package-only apply missing package identity"
[ -f "$pkgroot/dist/remote-device/device.js" ] || fail "package-only apply missing audited source"
[ -f "$target/probe.mjs" ] || fail "package-only apply missing fixed probe"
[ -f "$target/.mcl-rdc-rotation-repro-v1" ] || fail "package-only apply missing ownership marker"
[ ! -e "$(stage_path)" ] || fail "package-only apply left staging"
set -- "$target/node_modules"/*
[ "$#" -eq 1 ] && [ "$(basename "$1")" = '@wonderwhy-er' ] || fail "package-only apply materialized unrelated dependency root"
set -- "$target/node_modules/@wonderwhy-er"/*
[ "$#" -eq 1 ] && [ "$(basename "$1")" = 'desktop-commander' ] || fail "package-only apply materialized unrelated scoped dependency"
ok "package-only acquisition preserves exact target shape without transitive dependencies"

reset_lab
export MOCK_DIAG_MODE=verify_fail
err="$TMP/verify-fail.err"
: > "$err"
if out=$("$PREP" --apply 2>"$err"); then fail "verify failure exited zero"; fi
[ "$out" = "$(expected_diag blocked verify_failed conflict)" ] || fail "verify failure classification mismatch"
[ -e "$(target_path)" ] || fail "verify failure unexpectedly removed target"
[ ! -e "$(stage_path)" ] || fail "verify-failure fixture left staging"
printf '%s\n' "$out" | grep -Fq PRIVATE_CHILD && fail "verify child stdout leaked"
grep -Fq PRIVATE_CHILD "$err" && fail "verify child stderr leaked"
ok "post-install mismatch emits only sanitized verify_failed"

if "$PREP" --diagnose extra >/dev/null 2>&1; then fail "diagnose accepted extra args"; fi
if "$PREP" --cleanup extra >/dev/null 2>&1; then fail "cleanup accepted extra args"; fi
if "$PREP" --arbitrary >/dev/null 2>&1; then fail "unsupported mode accepted"; fi
! grep -Eq -- '--shared-home|--bind|-b[[:space:]]' "$PREP" || fail "host sharing present"
! grep -Eq '(^|[^A-Za-z])(eval|exec)[[:space:]]' "$PREP" || fail "generic executor present"
grep -Fq "PACKAGE='@wonderwhy-er/desktop-commander'" "$PREP" || fail "fixed package constant missing"
grep -Fq "VERSION='0.2.50'" "$PREP" || fail "fixed version constant missing"
grep -Fq 'mcl-rdc-rotation-stage:v1' "$PREP" || fail "future stage ownership marker missing"
grep -Fq '.mcl-rdc-rotation-classifier-v1' "$PREP" || fail "fixed classifier record missing"
! grep -Fq '3>&1' "$PREP" || fail "fd3 classifier transport still present"
grep -Fq '3>&-' "$PREP" || fail "install fd3 is not explicitly closed"
grep -Fq '/usr/bin/npm ping --silent >/dev/null 2>&1' "$PREP" || fail "network probe not output-suppressed"
grep -Fq '/usr/bin/npm view "@wonderwhy-er/desktop-commander@0.2.50" version --silent >/dev/null 2>&1' "$PREP" || fail "package probe not output-suppressed"
grep -Fq '/usr/bin/npm pack --ignore-scripts --pack-destination "$archive_dir"' "$PREP" || fail "package-only archive acquisition missing"
! grep -Fq '/usr/bin/npm install --prefix' "$PREP" || fail "broad transitive dependency install still present"
grep -Fq '/usr/bin/tar --no-same-owner --no-same-permissions --strip-components=1 -xzf "$archive" -C "$pkg_root"' "$PREP" || fail "fixed archive extraction missing"
sh -n "$PREP"
sh -n "$0"
ok "surface remains fixed, isolated, output-bounded, and shell-valid"

echo "1..$PASS"
