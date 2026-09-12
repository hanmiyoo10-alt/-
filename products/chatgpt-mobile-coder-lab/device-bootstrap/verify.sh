#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
PROFILE=common
CONTEXT=auto

usage() {
    cat <<'EOF'
usage: verify.sh [--profile common] [--context auto|termux|ubuntu]
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --profile)
            shift
            [ "$#" -gt 0 ] || { usage >&2; exit 2; }
            PROFILE=$1
            ;;
        --context)
            shift
            [ "$#" -gt 0 ] || { usage >&2; exit 2; }
            CONTEXT=$1
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            usage >&2
            exit 2
            ;;
    esac
    shift
done
[ "$PROFILE" = common ] || { usage >&2; exit 2; }
case "$CONTEXT" in auto|termux|ubuntu) ;; *) usage >&2; exit 2 ;; esac

exec "$SCRIPT_DIR/bootstrap.sh" --check --profile "$PROFILE" --context "$CONTEXT"
