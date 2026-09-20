#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
DEFAULT_GIT_NAME=${MCL_DEFAULT_GIT_NAME:-hanmiyoo10-alt}
DEFAULT_GIT_EMAIL=${MCL_DEFAULT_GIT_EMAIL:-260735128+hanmiyoo10-alt@users.noreply.github.com}

MODE=check
MODE_SET=
PROFILE=common
CONTEXT=auto
BLOCKING=0
APT_UPDATED=0

usage() {
    cat <<'EOF'
usage: bootstrap.sh [--check|--apply] [--profile common|termux-api] [--context auto|termux|ubuntu]
EOF
}

fail_usage() {
    usage >&2
    exit 2
}

emit() {
    printf '%s %s\n' "$1" "$2"
}

mark_blocking() {
    BLOCKING=1
}
while [ "$#" -gt 0 ]; do
    case "$1" in
        --check|--apply)
            requested=${1#--}
            if [ -n "$MODE_SET" ] && [ "$MODE_SET" != "$requested" ]; then
                fail_usage
            fi
            MODE=$requested
            MODE_SET=$requested
            ;;
        --profile)
            shift
            [ "$#" -gt 0 ] || fail_usage
            PROFILE=$1
            ;;
        --context)
            shift
            [ "$#" -gt 0 ] || fail_usage
            CONTEXT=$1
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            fail_usage
            ;;
    esac
    shift
done

case "$PROFILE" in common|termux-api) ;; *) fail_usage ;; esac
case "$CONTEXT" in auto|termux|ubuntu) ;; *) fail_usage ;; esac
detect_context() {
    if [ "$CONTEXT" != auto ]; then
        return 0
    fi

    if [ -r /etc/os-release ] && grep -q '^ID=ubuntu$' /etc/os-release 2>/dev/null; then
        CONTEXT=ubuntu
        return 0
    fi

    case "${PREFIX:-}" in
        /data/data/com.termux/*)
            CONTEXT=termux
            return 0
            ;;
    esac

    if [ -n "${TERMUX_VERSION:-}" ]; then
        CONTEXT=termux
        return 0
    fi

    emit BLOCKED context:unknown
    exit 2
}

detect_context

if [ "$PROFILE" = termux-api ] && [ "$CONTEXT" != termux ]; then
    emit BLOCKED "profile-context:termux-api:$CONTEXT"
    exit 2
fi

case "$PROFILE:$CONTEXT" in
    common:termux) MANIFEST="$SCRIPT_DIR/manifests/common.termux.txt" ;;
    common:ubuntu) MANIFEST="$SCRIPT_DIR/manifests/common.ubuntu.txt" ;;
    termux-api:termux) MANIFEST="$SCRIPT_DIR/manifests/termux-api.termux.txt" ;;
    *) fail_usage ;;
esac

[ -r "$MANIFEST" ] || {
    emit FAILED "manifest:$MANIFEST"
    exit 2
}
package_present() {
    dpkg-query -W -f='${Status}\n' "$1" 2>/dev/null | grep -q '^install ok installed$'
}

install_package() {
    package=$1
    case "$CONTEXT" in
        termux)
            if ! command -v pkg >/dev/null 2>&1; then
                emit FAILED package-manager:pkg
                return 1
            fi
            pkg install -y "$package" >/dev/null || return 1
            ;;
        ubuntu)
            if ! command -v apt-get >/dev/null 2>&1; then
                emit FAILED package-manager:apt-get
                return 1
            fi
            if [ "$APT_UPDATED" -eq 0 ]; then
                apt-get update >/dev/null || return 1
                APT_UPDATED=1
            fi
            apt-get install -y "$package" >/dev/null || return 1
            ;;
    esac
}

check_required_command() {
    package=$1
    command_name=$2
    if command -v "$command_name" >/dev/null 2>&1; then
        emit PRESENT "command:$command_name"
    else
        emit FAILED "command:$command_name package:$package"
        mark_blocking
    fi
}
if ! command -v dpkg-query >/dev/null 2>&1; then
    emit BLOCKED package-query:dpkg-query
    exit 2
fi

while IFS='|' read -r package command_name; do
    case "$package" in
        ''|'#'*) continue ;;
    esac
    [ -n "$command_name" ] || {
        emit FAILED "manifest-row:$package"
        mark_blocking
        continue
    }

    if package_present "$package"; then
        emit PRESENT "package:$package"
        check_required_command "$package" "$command_name"
        continue
    fi

    if [ "$MODE" = check ]; then
        emit MISSING "package:$package"
        mark_blocking
        continue
    fi

    if install_package "$package" && package_present "$package"; then
        emit INSTALLED "package:$package"
        check_required_command "$package" "$command_name"
    else
        emit FAILED "package:$package"
        mark_blocking
    fi
done < "$MANIFEST"
git_config_value() {
    git config --global --get "$1" 2>/dev/null || true
}

ensure_git_identity_field() {
    key=$1
    default_value=$2
    current=$(git_config_value "$key")

    if [ -n "$current" ]; then
        emit PRESENT "git-identity:$key"
        return 0
    fi

    if [ "$MODE" = check ]; then
        emit MISSING "git-identity:$key"
        mark_blocking
        return 0
    fi

    if git config --global "$key" "$default_value" >/dev/null 2>&1 \
        && [ -n "$(git_config_value "$key")" ]; then
        emit INSTALLED "git-identity:$key"
    else
        emit FAILED "git-identity:$key"
        mark_blocking
    fi
}

if [ "$PROFILE" = common ]; then
    if command -v git >/dev/null 2>&1; then
        ensure_git_identity_field user.name "$DEFAULT_GIT_NAME"
        ensure_git_identity_field user.email "$DEFAULT_GIT_EMAIL"
    else
        emit BLOCKED git-identity:git-unavailable
        mark_blocking
    fi
fi
check_github_auth() {
    if ! command -v gh >/dev/null 2>&1; then
        emit NEEDS_MANUAL auth:github-cli-unavailable
        return 0
    fi
    if gh auth status >/dev/null 2>&1; then
        emit PRESENT auth:github
    else
        emit NEEDS_MANUAL auth:github
    fi
}

check_android_app() {
    package_id=$1
    label=$2
    if ! command -v pm >/dev/null 2>&1; then
        emit NEEDS_MANUAL android-app-check:pm-unavailable
        return 0
    fi
    if pm path "$package_id" >/dev/null 2>&1; then
        emit PRESENT "android-app:$label"
    else
        emit NEEDS_MANUAL "android-app:$label"
    fi
}

check_required_android_app() {
    package_id=$1
    label=$2
    if ! command -v pm >/dev/null 2>&1; then
        emit NEEDS_MANUAL android-app-check:pm-unavailable
        mark_blocking
        return 0
    fi
    if pm path "$package_id" >/dev/null 2>&1; then
        emit PRESENT "android-app:$label"
    else
        emit NEEDS_MANUAL "android-app:$label"
        mark_blocking
    fi
}

check_ubuntu_presence() {
    if ! command -v proot-distro >/dev/null 2>&1; then
        emit BLOCKED ubuntu-proot:proot-distro-unavailable
        mark_blocking
        return 0
    fi
    if proot-distro login ubuntu -- true >/dev/null 2>&1; then
        emit PRESENT ubuntu-proot
    else
        emit BLOCKED ubuntu-proot:missing
        mark_blocking
    fi
}
if [ "$PROFILE" = common ]; then
    check_github_auth
    if [ "$CONTEXT" = termux ]; then
        check_android_app com.termux.boot termux-boot
        check_android_app com.termux.api termux-api
        check_android_app com.tailscale.ipn tailscale
        check_ubuntu_presence
    fi
else
    check_required_android_app com.termux.api termux-api
fi

if [ "$BLOCKING" -ne 0 ]; then
    exit 1
fi

emit PRESENT "profile:$PROFILE context:$CONTEXT"
exit 0
