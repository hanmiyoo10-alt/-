# shellcheck shell=bash
if [[ ${__TASKBRIDGE_SHELL_NOTIFY_LOADED:-0} == 1 ]]; then
    return 0
fi
if [[ ${__TASKBRIDGE_DEBUG_TRAP_CLEAR:-0} != 1 ]]; then
    printf '%s\n' 'TaskBridge shell-notify: activate through the managed .bashrc block.' >&2
    return 0
fi

__TASKBRIDGE_SHELL_NOTIFY_LOADED=1
__TASKBRIDGE_ACTIVE=0
# Stay guarded until the first prompt after sourcing so hook setup commands are never treated as user work.
__TASKBRIDGE_IN_PROMPT=1
__TASKBRIDGE_START_SECONDS=0
__TASKBRIDGE_LABEL='Termux 명령'

__taskbridge_safe_label() {
    local raw=${1-}
    local token
    raw="${raw#"${raw%%[![:space:]]*}"}"
    token=${raw%%[[:space:]]*}
    token=${token##*/}
    if [[ -z $token || $token == *=* || $token == __taskbridge* || $token == trap || $token == PROMPT_COMMAND ]]; then
        printf '%s' 'Termux 명령'
        return 0
    fi
    if [[ $token == *[!a-zA-Z0-9._+-]* ]]; then
        printf '%s' 'Termux 명령'
        return 0
    fi
    printf '%.48s' "$token"
}

__taskbridge_debug_hook() {
    local prior_status=${1:-0}
    local command=${2-}
    if (( __TASKBRIDGE_IN_PROMPT )); then
        return "$prior_status"
    fi
    if (( ! __TASKBRIDGE_ACTIVE )); then
        __TASKBRIDGE_ACTIVE=1
        __TASKBRIDGE_START_SECONDS=${SECONDS:-0}
        __TASKBRIDGE_LABEL=$(__taskbridge_safe_label "$command")
    fi
    return "$prior_status"
}

__taskbridge_precmd() {
    local prior_status=${1:-0}
    local now elapsed
    __TASKBRIDGE_IN_PROMPT=1
    if (( __TASKBRIDGE_ACTIVE )); then
        now=${SECONDS:-0}
        elapsed=$(( now - __TASKBRIDGE_START_SECONDS ))
        (( elapsed < 0 )) && elapsed=0
        if (( elapsed >= __TASKBRIDGE_MIN_SECONDS )); then
            "$__TASKBRIDGE_PYTHON" "$__TASKBRIDGE_SHELL_NOTIFY_SCRIPT" emit \
                --status "$prior_status" \
                --label "$__TASKBRIDGE_LABEL" \
                --elapsed "$elapsed" \
                --shell-pid "$$" >/dev/null 2>&1 || true
        fi
    fi
    __TASKBRIDGE_ACTIVE=0
    return "$prior_status"
}

__taskbridge_postprompt() {
    local prior_status=${1:-0}
    __TASKBRIDGE_IN_PROMPT=0
    return "$prior_status"
}

if declare -p PROMPT_COMMAND 2>/dev/null | grep -q '^declare -a '; then
    PROMPT_COMMAND=( '__taskbridge_precmd "$?"' "${PROMPT_COMMAND[@]}" '__taskbridge_postprompt "$?"' )
elif [[ -n ${PROMPT_COMMAND-} ]]; then
    PROMPT_COMMAND='__taskbridge_precmd "$?";'"$PROMPT_COMMAND"';__taskbridge_postprompt "$?"'
else
    PROMPT_COMMAND='__taskbridge_precmd "$?";__taskbridge_postprompt "$?"'
fi
trap '__taskbridge_debug_hook "$?" "$BASH_COMMAND"' DEBUG
