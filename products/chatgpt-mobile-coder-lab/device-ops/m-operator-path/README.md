# M operator PATH profile

This owner manages one fixed main-phone `M` operator-shell PATH rule:

```text
$HOME/.local/bin
```

It exists so already-reviewed user-local MCL commands can be found from normal
Bash operator shells. It does not install those commands and does not own
service, runit, package-manager, Ubuntu PRoot, PRIVATE LAB, VM LAB, Git,
release, or production environment.

## Commands

```sh
./mcl-m-operator-path --check
./mcl-m-operator-path --apply
```

`--check` is read-only. `--apply` is the only mutation mode. There is no
caller-selected home, profile path, PATH value, executable, package, service,
or arbitrary command.
## Fixed live scope

Production invocation is valid only for the fixed M Termux home:

```text
/data/data/com.termux/files/home
```

The owner requires an existing non-symlink `$HOME/.local/bin` directory and
existing regular non-symlink Bash profiles:

```text
$HOME/.bash_profile
$HOME/.bashrc
```

It never creates those objects. Missing or conflicting fixed objects fail
closed.

The exact managed block is:

```sh
# BEGIN mcl-m-operator-path:v1
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) export PATH="$HOME/.local/bin:$PATH" ;;
esac
# END mcl-m-operator-path:v1
```
The block is appended only when absent and never duplicates the local-bin
entry. Existing profile bytes are preserved in place. Duplicate, partial, or
modified managed markers are conflicts rather than repair authority.

## Receipt

Output is exactly:

```text
schema=mcl-m-operator-path.v1
local_bin=<present|missing|conflict>
login_profile=<present|missing|conflict>
interactive_profile=<present|missing|conflict>
result=<pass|needs_apply|blocked|unknown>
details=withheld
```

A converged check exits 0. `needs_apply` exits 1. `blocked` or `unknown`
exits 2. Invalid CLI syntax exits 2 without widening the public interface.

## Preservation

This owner does not source or execute the complete real shell profiles.
In particular it preserves the existing `mcl-termux-login-env:v2`,
`$HOME/bin` PATH line, and unrelated AUTO SIMRESUME content. It does not
change service/runit PATH or install `mcl-env-status`, `mcl-adb-ui`, or
authoring packages.

Contract tests use an explicit synthetic-root test mode that is unavailable as
a public CLI selector. Live M apply belongs to the later postmerge experiment
stage, not repository IMPLEMENTATION_PR.
