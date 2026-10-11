# shellcheck shell=zsh
if [[ ${__TASKBRIDGE_SHELL_NOTIFY_LOADED:-0} == 1 ]]; then
    return 0
fi

__TASKBRIDGE_SHELL_NOTIFY_LOADED=1
__TASKBRIDGE_ACTIVE=0
__TASKBRIDGE_START_SECONDS=0
__TASKBRIDGE_LABEL='Termux 명령'

__taskbridge_zsh_safe_label() {
    local raw=${1-}
    local token
    raw="${raw#"${raw%%[![:space:]]*}"}"
    token=${raw%%[[:space:]]*}
    token=${token:t}
    if [[ -z $token || $token == *=* || $token == __taskbridge* || $token == trap || $token == PROMPT_COMMAND ]]; then
        print -rn -- 'Termux 명령'
        return 0
    fi
    if [[ $token == *[!a-zA-Z0-9._+-]* ]]; then
        print -rn -- 'Termux 명령'
        return 0
    fi
    print -rn -- ${token[1,48]}
}

__taskbridge_zsh_preexec() {
    __TASKBRIDGE_ACTIVE=1
    __TASKBRIDGE_START_SECONDS=${SECONDS:-0}
    __TASKBRIDGE_LABEL=$(__taskbridge_zsh_safe_label "${1-}")
}

__taskbridge_zsh_precmd() {
    local prior_status=$?
    local now elapsed
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

autoload -Uz add-zsh-hook
add-zsh-hook preexec __taskbridge_zsh_preexec
add-zsh-hook precmd __taskbridge_zsh_precmd
preexec_functions=(__taskbridge_zsh_preexec ${preexec_functions:#__taskbridge_zsh_preexec})
precmd_functions=(__taskbridge_zsh_precmd ${precmd_functions:#__taskbridge_zsh_precmd})
