#!/bin/sh
set -eu
LAB_NAME=mcl-private-lab
PREFIX=/data/data/com.termux/files/usr
PD="$PREFIX/bin/proot-distro"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
PROBE_SOURCE="$SCRIPT_DIR/probe.mjs"
PACKAGE='@wonderwhy-er/desktop-commander'
VERSION='0.2.50'
DIAG_SCHEMA='mcl-private-prepare-diagnostic.v1'
DIAG_CHECK='rdc-rotation-prepare'
MAX_DIAG_BYTES=256
STAGE_MARKER='mcl-rdc-rotation-stage:v1'

if [ "${MCL_ROTATION_PREPARE_TEST_MODE:-0}" = 1 ]; then
  TEST_ROOT=${MCL_ROTATION_PREPARE_TEST_ROOT:-}
  [ -n "$TEST_ROOT" ] || { echo 'BLOCKED test fixture missing' >&2; exit 2; }
  PD="$TEST_ROOT/proot-distro"
fi

validate_diag() {
  candidate=$1
  bytes=$(printf '%s' "$candidate" | wc -c | tr -d '[:space:]')
  [ -n "$bytes" ] && [ "$bytes" -le "$MAX_DIAG_BYTES" ] || return 1
  lines=$(printf '%s\n' "$candidate" | wc -l | tr -d '[:space:]')
  [ "$lines" -eq 6 ] || return 1
  line1=$(printf '%s\n' "$candidate" | sed -n '1p')
  line2=$(printf '%s\n' "$candidate" | sed -n '2p')
  line3=$(printf '%s\n' "$candidate" | sed -n '3p')
  line4=$(printf '%s\n' "$candidate" | sed -n '4p')
  line5=$(printf '%s\n' "$candidate" | sed -n '5p')
  line6=$(printf '%s\n' "$candidate" | sed -n '6p')
  [ "$line1" = "schema=$DIAG_SCHEMA" ] || return 1
  [ "$line2" = "check=$DIAG_CHECK" ] || return 1
  [ "$line6" = 'details=withheld' ] || return 1
  DIAG_RESULT=${line3#result=}
  [ "result=$DIAG_RESULT" = "$line3" ] || return 1
  case "$DIAG_RESULT" in pass|blocked|unknown) ;; *) return 1 ;; esac
  DIAG_CLASS=${line4#class=}
  [ "class=$DIAG_CLASS" = "$line4" ] || return 1
  case "$DIAG_CLASS" in ready|lab_unavailable|stage_conflict|target_conflict|npm_unavailable|network_unavailable|package_unavailable|install_failed|install_entry_failed|install_precondition_failed|workspace_failed|package_install_failed|package_identity_failed|materialize_failed|publish_failed|verify_failed|unknown) ;; *) return 1 ;; esac
  DIAG_STAGING=${line5#staging=}
  [ "staging=$DIAG_STAGING" = "$line5" ] || return 1
  case "$DIAG_STAGING" in none|cleanup_eligible|conflict) ;; *) return 1 ;; esac
  VALID_DIAG=$candidate
}

emit_diag() {
  result=$1
  class=$2
  staging=$3
  candidate=$(printf '%s\n' \
    "schema=$DIAG_SCHEMA" \
    "check=$DIAG_CHECK" \
    "result=$result" \
    "class=$class" \
    "staging=$staging" \
    'details=withheld')
  validate_diag "$candidate" || exit 1
  printf '%s\n' "$VALID_DIAG"
}

if [ "${MCL_ROTATION_PREPARE_TEST_MODE:-0}" = 1 ] && [ "${MCL_ROTATION_PREPARE_TEST_VALIDATE:-0}" = 1 ]; then
  validate_diag "${MCL_ROTATION_PREPARE_TEST_CANDIDATE:-}" || exit 1
  printf '%s\n' "$VALID_DIAG"
  exit 0
fi

usage() { echo 'BLOCKED unsupported command' >&2; exit 2; }
[ "$#" -eq 1 ] || usage
MODE=${1#--}
case "$MODE" in check|apply|diagnose|cleanup) ;; *) usage ;; esac
[ -x "$PD" ] || {
  if [ "$MODE" = diagnose ] || [ "$MODE" = cleanup ]; then emit_diag blocked lab_unavailable conflict; exit 1; fi
  echo 'BLOCKED proot-distro unavailable' >&2; exit 1
}
[ -f "$PROBE_SOURCE" ] || {
  if [ "$MODE" = diagnose ] || [ "$MODE" = cleanup ]; then emit_diag unknown unknown conflict; exit 1; fi
  echo 'BLOCKED fixed probe missing' >&2; exit 1
}

check_state() {
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:check:v1
set -eu
target=/opt/mcl-private-lab/vendor/rdc-session-rotation
marker=$target/.mcl-rdc-rotation-repro-v1
pkg=$target/node_modules/@wonderwhy-er/desktop-commander/package.json
probe=$target/probe.mjs
if [ ! -e "$target" ]; then echo "MISSING vendor:0.2.50"; exit 0; fi
[ -d "$target" ] || { echo "BLOCKED vendor:unmanaged"; exit 1; }
[ -f "$marker" ] && grep -Fxq "mcl-rdc-rotation-repro:v1" "$marker" || { echo "BLOCKED vendor:unmanaged"; exit 1; }
[ -f "$pkg" ] && grep -Fq '"version": "0.2.50"' "$pkg" || { echo "BLOCKED vendor:version"; exit 1; }
[ -f "$probe" ] || { echo "BLOCKED vendor:probe"; exit 1; }
echo "PRESENT vendor:0.2.50"
' 2>/dev/null
}

lab_probe() {
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:lab-probe:v1
set -eu
[ -f /etc/mcl-private-lab ]
[ -d /opt/mcl-private-lab/vendor ]
' >/dev/null 2>&1
}

inspect_stage() {
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:inspect-stage:v1
set -eu
target=/opt/mcl-private-lab/vendor/rdc-session-rotation
stage=/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage
stage_marker=$stage/.mcl-rdc-rotation-stage-v1
conflict() { printf "%s\n" stage_conflict; exit 0; }
if [ -e "$target" ] || [ -L "$target" ]; then printf "%s\n" target_conflict; exit 0; fi
if [ ! -e "$stage" ] && [ ! -L "$stage" ]; then printf "%s\n" none; exit 0; fi
[ -d "$stage" ] && [ ! -L "$stage" ] || conflict
count=0
have_probe=0
have_marker=0
for entry in "$stage"/* "$stage"/.[!.]* "$stage"/..?*; do
  [ -e "$entry" ] || [ -L "$entry" ] || continue
  count=$((count + 1))
  case "$entry" in
    "$stage/probe.mjs") [ -f "$entry" ] && [ ! -L "$entry" ] || conflict; have_probe=1 ;;
    "$stage/.mcl-rdc-rotation-stage-v1")
      [ -f "$entry" ] && [ ! -L "$entry" ] && grep -Fxq "mcl-rdc-rotation-stage:v1" "$entry" || conflict
      have_marker=1 ;;
    *) conflict ;;
  esac
done
[ "$have_probe" -eq 1 ] || conflict
case "$count:$have_marker" in 1:0|2:1) ;; *) conflict ;; esac
cmp -s "$stage/probe.mjs" - || conflict
printf "%s\n" cleanup_eligible
' < "$PROBE_SOURCE" 2>/dev/null
}

npm_probe() {
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:npm-probe:v1
set -eu
[ -x /usr/bin/npm ]
/usr/bin/npm --version >/dev/null 2>&1
' >/dev/null 2>&1
}

network_probe() {
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:network-probe:v1
set -eu
env -i HOME=/root PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  /usr/bin/npm ping --silent >/dev/null 2>&1
' >/dev/null 2>&1
}

package_probe() {
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:package-probe:v1
set -eu
env -i HOME=/root PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  /usr/bin/npm view "@wonderwhy-er/desktop-commander@0.2.50" version --silent >/dev/null 2>&1
' >/dev/null 2>&1
}

classify_apply_staging() {
  if apply_stage_state=$(inspect_stage); then :; else printf '%s\n' conflict; return 0; fi
  case "$apply_stage_state" in
    none|cleanup_eligible) printf '%s\n' "$apply_stage_state" ;;
    target_conflict|stage_conflict) printf '%s\n' conflict ;;
    *) printf '%s\n' conflict ;;
  esac
}

emit_apply_failure() {
  apply_class=$1
  apply_staging=$(classify_apply_staging)
  emit_diag blocked "$apply_class" "$apply_staging"
  exit 1
}

emit_apply_precondition_failure() {
  if apply_pre_state=$(inspect_stage); then :; else emit_diag unknown unknown conflict; exit 1; fi
  case "$apply_pre_state" in
    target_conflict) emit_diag blocked target_conflict conflict ;;
    stage_conflict) emit_diag blocked stage_conflict conflict ;;
    none|cleanup_eligible) emit_diag unknown unknown "$apply_pre_state" ;;
    *) emit_diag unknown unknown conflict ;;
  esac
  exit 1
}

cleanup_stage() {
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:cleanup-stage:v1
set -eu
target=/opt/mcl-private-lab/vendor/rdc-session-rotation
stage=/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage
conflict() { printf "%s\n" stage_conflict; exit 0; }
if [ -e "$target" ] || [ -L "$target" ]; then printf "%s\n" target_conflict; exit 0; fi
if [ ! -e "$stage" ] && [ ! -L "$stage" ]; then printf "%s\n" none; exit 0; fi
[ -d "$stage" ] && [ ! -L "$stage" ] || conflict
count=0
have_probe=0
have_marker=0
for entry in "$stage"/* "$stage"/.[!.]* "$stage"/..?*; do
  [ -e "$entry" ] || [ -L "$entry" ] || continue
  count=$((count + 1))
  case "$entry" in
    "$stage/probe.mjs") [ -f "$entry" ] && [ ! -L "$entry" ] || conflict; have_probe=1 ;;
    "$stage/.mcl-rdc-rotation-stage-v1")
      [ -f "$entry" ] && [ ! -L "$entry" ] && grep -Fxq "mcl-rdc-rotation-stage:v1" "$entry" || conflict
      have_marker=1 ;;
    *) conflict ;;
  esac
done
[ "$have_probe" -eq 1 ] || conflict
case "$count:$have_marker" in 1:0|2:1) ;; *) conflict ;; esac
cmp -s "$stage/probe.mjs" - || conflict
rm -rf -- "$stage"
printf "%s\n" cleaned
' < "$PROBE_SOURCE" 2>/dev/null
}

if [ "$MODE" = diagnose ]; then
  lab_probe || { emit_diag blocked lab_unavailable conflict; exit 1; }
  if staging_state=$(inspect_stage); then :; else emit_diag unknown unknown conflict; exit 1; fi
  case "$staging_state" in
    target_conflict) emit_diag blocked target_conflict conflict; exit 1 ;;
    stage_conflict) emit_diag blocked stage_conflict conflict; exit 1 ;;
    none|cleanup_eligible) ;;
    *) emit_diag unknown unknown conflict; exit 1 ;;
  esac
  npm_probe || { emit_diag blocked npm_unavailable "$staging_state"; exit 1; }
  network_probe || { emit_diag blocked network_unavailable "$staging_state"; exit 1; }
  package_probe || { emit_diag blocked package_unavailable "$staging_state"; exit 1; }
  emit_diag pass ready "$staging_state"
  exit 0
fi

if [ "$MODE" = cleanup ]; then
  lab_probe || { emit_diag blocked lab_unavailable conflict; exit 1; }
  if cleanup_state=$(cleanup_stage); then :; else emit_diag unknown unknown conflict; exit 1; fi
  case "$cleanup_state" in
    none|cleaned) emit_diag pass ready none; exit 0 ;;
    target_conflict) emit_diag blocked target_conflict conflict; exit 1 ;;
    stage_conflict) emit_diag blocked stage_conflict conflict; exit 1 ;;
    *) emit_diag unknown unknown conflict; exit 1 ;;
  esac
fi

if [ "$MODE" = check ]; then check_state; exit $?; fi
if state=$(check_state); then :; else emit_apply_precondition_failure; fi
[ "$state" = 'MISSING vendor:0.2.50' ] || { printf '%s\n' "$state"; exit 0; }

if "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:stage-probe:v1
set -eu
stage=/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage
[ ! -e "$stage" ] && [ ! -L "$stage" ] || exit 24
mkdir "$stage"
umask 077
cat > "$stage/probe.mjs.tmp"
mv -f "$stage/probe.mjs.tmp" "$stage/probe.mjs"
printf "%s\n" "mcl-rdc-rotation-stage:v1" > "$stage/.mcl-rdc-rotation-stage-v1"
' < "$PROBE_SOURCE" >/dev/null 2>&1; then :; else emit_apply_precondition_failure; fi

if install_class=$("$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:install:v1
set -eu
base=/opt/mcl-private-lab/vendor
target=$base/rdc-session-rotation
stage=$base/.rdc-session-rotation-stage
milestone() { printf '%s\n' "$1" >&3; exit 1; }
[ ! -e "$target" ] && [ ! -L "$target" ] || milestone install_precondition_failed
[ -f "$stage/probe.mjs" ] && [ ! -L "$stage/probe.mjs" ] || milestone install_precondition_failed
[ -f "$stage/.mcl-rdc-rotation-stage-v1" ] && grep -Fxq "mcl-rdc-rotation-stage:v1" "$stage/.mcl-rdc-rotation-stage-v1" || milestone install_precondition_failed
tmp=$(mktemp -d "$base/.rdc-session-rotation.XXXXXX") || milestone workspace_failed
trap "rm -rf \"$tmp\"" EXIT HUP INT TERM
env -i HOME=/root PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  /usr/bin/npm install --prefix "$tmp" --omit=dev --ignore-scripts --no-save \
  "@wonderwhy-er/desktop-commander@0.2.50" >/dev/null 2>&1 || milestone package_install_failed
pkg=$tmp/node_modules/@wonderwhy-er/desktop-commander/package.json
[ -f "$pkg" ] && grep -Fq '"version": "0.2.50"' "$pkg" || milestone package_identity_failed
cp "$stage/probe.mjs" "$tmp/probe.mjs" || milestone materialize_failed
chmod 0644 "$tmp/probe.mjs" || milestone materialize_failed
printf "%s\n" "mcl-rdc-rotation-repro:v1" > "$tmp/.mcl-rdc-rotation-repro-v1" || milestone materialize_failed
[ ! -e "$target" ] && [ ! -L "$target" ] || milestone publish_failed
mv -T "$tmp" "$target" || milestone publish_failed
trap - EXIT HUP INT TERM
rm -rf "$stage"
' 3>&1 >/dev/null 2>&1); then :; else
  case "$install_class" in
    install_precondition_failed|workspace_failed|package_install_failed|package_identity_failed|materialize_failed|publish_failed) emit_apply_failure "$install_class" ;;
    "") emit_apply_failure install_entry_failed ;;
    *) emit_apply_failure install_failed ;;
  esac
fi
if state=$(check_state); then :; else emit_apply_failure verify_failed; fi
[ "$state" = 'PRESENT vendor:0.2.50' ] || emit_apply_failure verify_failed
echo 'INSTALLED vendor:0.2.50'
