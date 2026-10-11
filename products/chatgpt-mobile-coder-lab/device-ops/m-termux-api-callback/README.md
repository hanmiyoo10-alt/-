# MCL M Termux:API callback owner v1

This owner repairs one narrow Android 16 callback transport gap for the exact M
Termux / Termux:API baseline.

It does **not** replace Termux:API, install an Android app, register JobScheduler
work, manage Samsung security settings, grant permissions, recover Termux by
itself, or expose a generic Termux:API client.

## Fixed operation

The only supported user-visible operation is:

```text
python mcl-m-termux-api-callback.py battery-status
```

The helper creates one short-lived filesystem Unix-domain server socket below:

```text
/data/data/com.termux/files/home/.cache/mcl-m-termux-api-callback/
```

It then invokes the fixed Termux `am` wrapper with argv only:

```text
broadcast
--user 0
-n com.termux.api/.TermuxApiReceiver
--es socket_output <fixed-private-generated-path>
--es api_method BatteryStatus
```

No shell is used and no caller-selected Android component, API method, intent
extra, socket directory, socket filename, package, or arbitrary command is
accepted.

## Why this owner exists

On the exact M Android 16 baseline:

- `termux-battery-status` times out;
- `termux-job-scheduler --pending` independently times out;
- the installed `termux-api` helper package is 0.59.1;
- the installed Termux:API app is 0.53.0;
- the existing helper creates abstract AF_UNIX callback sockets;
- explicit broadcast activation does start `com.termux.api`;
- exact Termux:API 0.53.0 `ResultReturner` already supports absolute
  filesystem socket paths below Termux app-data directories.

This owner therefore tests the narrowest package-free repair hypothesis:
preserve the existing Android app and API method while replacing only the
per-call result socket endpoint with one fixed Termux-private filesystem socket.

A passing repository test does not prove that Android 16 M accepts the callback.
That remains a later real-device `EXPERIMENT_CLOSE` gate.

## Security boundary

The runtime helper:

- accepts exactly `battery-status`;
- fixes the Android component to
  `com.termux.api/.TermuxApiReceiver`;
- fixes `api_method=BatteryStatus`;
- uses only the fixed Termux home and fixed private callback directory;
- requires the callback directory to be owned by the current UID and mode
  `0700`;
- creates one generated socket pathname within the Linux Unix-domain path limit;
- chmods the socket to `0600`;
- accepts exactly one callback connection;
- checks Linux `SO_PEERCRED` and requires the peer UID to equal the current
  shared Termux UID;
- uses a short fixed timeout;
- reads at most 16 KiB;
- requires strict UTF-8 JSON object output;
- never emits the battery JSON or individual battery values;
- always attempts to remove the generated socket;
- reaps the local `am` child on every path.

It does not call `termux-api-start`, mutate package state, change permissions,
change Android settings, relax SELinux/App Protection, use root/Shizuku, or
create a second Android package.

## Receipt

The public receipt is always the same ordered shape:

```text
schema=mcl-m-termux-api-callback.v1
operation=battery_status
transport=filesystem_unix
connection=<connected|timeout|unknown>
peer=<same_uid|mismatch|unknown>
payload=<valid_json|invalid_utf8|invalid_json|oversize|unknown>
result=<pass|blocked|unknown>
details=withheld
```

No raw JSON, socket path, PID, UID, Android log, stderr, or free-form diagnostic
text is part of the receipt.

Exit codes:

- `0`: callback connected, peer UID matched, bounded strict JSON object read;
- `3`: bounded fail-closed condition;
- `4`: unexpected/unknown local failure;
- `64`: unsupported invocation.

## Validation

Repository validation owns only the helper contract:

```text
python3 -m unittest discover   -s products/chatgpt-mobile-coder-lab/device-ops/m-termux-api-callback/tests -v

python3 -m py_compile   products/chatgpt-mobile-coder-lab/device-ops/m-termux-api-callback/mcl-m-termux-api-callback.py
```

The tests cover fixed argv, private-directory mode, symlink refusal, socket path
bounds, same-UID peer credentials, peer mismatch, timeout, payload size,
UTF-8/JSON validation, cleanup, bounded CLI behavior, and receipt redaction.

## Live-proof boundary

After merge/postmerge only, the exact merged helper may be materialized on M and
run twice with a short idle interval:

```text
python .../mcl-m-termux-api-callback.py battery-status
```

Both calls must return `result=pass` without package/service/settings/permission
mutation. Only then may the separate APK-free JobScheduler candidate be
reconsidered. This owner does not register or cancel jobs.
