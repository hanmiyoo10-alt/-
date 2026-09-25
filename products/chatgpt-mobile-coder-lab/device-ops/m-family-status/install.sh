#!/bin/sh
set -eu

SCHEMA=mcl-m-family-status-install.v1
FIXED_HOME=/data/data/com.termux/files/home
FIXED_PREFIX=/data/data/com.termux/files/usr
MODE=${1:-}

usage() {
  echo 'usage: install.sh --check|--apply' >&2
  exit 2
}
[ "$#" -eq 1 ] || usage
case "$MODE" in --check|--apply) ;; *) usage ;; esac

HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$HERE/../../../.." && pwd)
TEST_MODE=${MCL_M_FAMILY_STATUS_INSTALL_TEST_MODE:-0}

if [ "$TEST_MODE" = 1 ]; then
  HOME_DIR=${MCL_M_FAMILY_STATUS_INSTALL_TEST_HOME:-}
  PREFIX_DIR=${MCL_M_FAMILY_STATUS_INSTALL_TEST_PREFIX:-}
  SOURCE_ROOT=${MCL_M_FAMILY_STATUS_INSTALL_TEST_SOURCE_ROOT:-}
  case "$HOME_DIR:$PREFIX_DIR:$SOURCE_ROOT" in
    /*:/*:/*) ;;
    *) echo 'BLOCKED invalid test fixture' >&2; exit 2 ;;
  esac
else
  [ "$TEST_MODE" = 0 ] || { echo 'BLOCKED invalid test mode' >&2; exit 2; }
  [ "${HOME:-}" = "$FIXED_HOME" ] || { echo 'BLOCKED wrong home' >&2; exit 2; }
  HOME_DIR=$FIXED_HOME
  PREFIX_DIR=$FIXED_PREFIX
  SOURCE_ROOT=$REPO_ROOT
fi

BUNDLE_ROOT="$HOME_DIR/.local/share/mcl-m-family-status"
BUNDLE_REPO="$BUNDLE_ROOT/repo"
LAUNCHER="$PREFIX_DIR/bin/mcl-env-status"

managed_specs() {
  cat <<'EOF'
products/chatgpt-mobile-coder-lab/device-ops/m-family-status/mcl-env-status|755
products/chatgpt-mobile-coder-lab/device-ops/m-termux-operator/bootstrap.sh|755
products/chatgpt-mobile-coder-lab/device-ops/private-lab/bootstrap.sh|755
products/chatgpt-mobile-coder-lab/device-ops/private-lab/verify.sh|755
products/chatgpt-mobile-coder-lab/device-ops/private-lab/analysis-profile.sh|755
products/chatgpt-mobile-coder-lab/device-ops/vm-lab/bootstrap.sh|755
products/chatgpt-mobile-coder-lab/device-ops/vm-lab/verify.sh|755
tools/repo-env/resource-guard/guard.py|644
EOF
}

expected_rel_paths() {
  managed_specs | while IFS='|' read -r rel mode; do
    printf 'repo/%s\n' "$rel"
  done
}

launcher_text() {
  target="$HOME_DIR/.local/share/mcl-m-family-status/repo/products/chatgpt-mobile-coder-lab/device-ops/m-family-status/mcl-env-status"
  printf '%s\n'     '#!/bin/sh'     '# mcl-m-family-status-launcher:v1'     'set -eu'     "exec '$target' \"\$@\""
}

dir_chain_safe() {
  target=$1
  p=$(dirname "$target")
  while [ "$p" != "$BUNDLE_ROOT" ] && [ "$p" != "/" ]; do
    [ ! -L "$p" ] || return 1
    [ ! -e "$p" ] || [ -d "$p" ] || return 1
    p=$(dirname "$p")
  done
  [ ! -L "$BUNDLE_ROOT" ] || return 1
  [ ! -e "$BUNDLE_ROOT" ] || [ -d "$BUNDLE_ROOT" ]
}

source_state() {
  managed_specs | while IFS='|' read -r rel mode; do
    src="$SOURCE_ROOT/$rel"
    [ -f "$src" ] && [ ! -L "$src" ] || { echo unknown; exit 0; }
    [ "$(stat -c %a "$src" 2>/dev/null || true)" = "$mode" ] || { echo unknown; exit 0; }
  done
  echo present
}

bundle_state() {
  [ -e "$BUNDLE_ROOT" ] || { echo missing; return; }
  [ -d "$BUNDLE_ROOT" ] && [ ! -L "$BUNDLE_ROOT" ] || { echo conflict; return; }

  extras=$(find "$BUNDLE_ROOT" -mindepth 1 ! -type d -print 2>/dev/null | while IFS= read -r item; do
    rel=${item#"$BUNDLE_ROOT/"}
    expected_rel_paths | grep -Fqx "$rel" || printf '%s\n' extra
  done)
  [ -z "$extras" ] || { echo conflict; return; }

  state=present
  while IFS='|' read -r rel mode; do
    src="$SOURCE_ROOT/$rel"
    dst="$BUNDLE_REPO/$rel"
    dir_chain_safe "$dst" || { echo conflict; return; }
    if [ ! -e "$dst" ]; then
      state=missing
      continue
    fi
    [ -f "$dst" ] && [ ! -L "$dst" ] || { echo conflict; return; }
    cmp -s "$src" "$dst" || state=missing
    [ "$(stat -c %a "$dst" 2>/dev/null || true)" = "$mode" ] || state=missing
  done <<EOF
$(managed_specs)
EOF
  echo "$state"
}

launcher_state() {
  [ -e "$LAUNCHER" ] || { echo missing; return; }
  [ -f "$LAUNCHER" ] && [ ! -L "$LAUNCHER" ] || { echo conflict; return; }
  grep -Fqx '# mcl-m-family-status-launcher:v1' "$LAUNCHER" 2>/dev/null || { echo conflict; return; }
  launcher_text | cmp -s - "$LAUNCHER" || { echo missing; return; }
  [ "$(stat -c %a "$LAUNCHER" 2>/dev/null || true)" = 755 ] || { echo missing; return; }
  echo present
}

SOURCE_STATE=unknown
BUNDLE_STATE=unknown
LAUNCHER_STATE=unknown
RESULT=unknown

classify() {
  SOURCE_STATE=$(source_state)
  if [ "$SOURCE_STATE" != present ]; then
    BUNDLE_STATE=unknown
    LAUNCHER_STATE=unknown
    RESULT=unknown
    return
  fi
  BUNDLE_STATE=$(bundle_state)
  LAUNCHER_STATE=$(launcher_state)
  if [ "$BUNDLE_STATE" = conflict ] || [ "$LAUNCHER_STATE" = conflict ]; then
    RESULT=blocked
  elif [ "$BUNDLE_STATE" = present ] && [ "$LAUNCHER_STATE" = present ]; then
    RESULT=pass
  elif [ "$BUNDLE_STATE" = unknown ] || [ "$LAUNCHER_STATE" = unknown ]; then
    RESULT=unknown
  else
    RESULT=needs_apply
  fi
}

emit_receipt() {
  printf '%s\n'     "schema=$SCHEMA"     "bundle=$BUNDLE_STATE"     "launcher=$LAUNCHER_STATE"     "result=$RESULT"     'details=withheld'
}

finish() {
  emit_receipt
  case "$RESULT" in
    pass) exit 0 ;;
    needs_apply) exit 1 ;;
    blocked|unknown) exit 2 ;;
    *) exit 2 ;;
  esac
}

classify
[ "$MODE" = --apply ] || finish
case "$RESULT" in
  pass) finish ;;
  needs_apply) ;;
  blocked|unknown) finish ;;
  *) RESULT=unknown; finish ;;
esac

[ -d "$PREFIX_DIR/bin" ] && [ ! -L "$PREFIX_DIR/bin" ] || {
  BUNDLE_STATE=unknown; LAUNCHER_STATE=conflict; RESULT=blocked; finish;
}

while IFS='|' read -r rel mode; do
  src="$SOURCE_ROOT/$rel"
  dst="$BUNDLE_REPO/$rel"
  dir_chain_safe "$dst" || { BUNDLE_STATE=conflict; RESULT=blocked; finish; }
  mkdir -p "$(dirname "$dst")"
  tmp="$dst.tmp.$$"
  trap 'rm -f "$tmp"' EXIT HUP INT TERM
  cp "$src" "$tmp"
  chmod "$mode" "$tmp"
  mv "$tmp" "$dst"
  trap - EXIT HUP INT TERM
done <<EOF
$(managed_specs)
EOF

tmp="$LAUNCHER.tmp.$$"
trap 'rm -f "$tmp"' EXIT HUP INT TERM
launcher_text > "$tmp"
chmod 755 "$tmp"
mv "$tmp" "$LAUNCHER"
trap - EXIT HUP INT TERM

classify
[ "$RESULT" = pass ] || { RESULT=unknown; finish; }
finish
