# Mobile Coder Lab Wireless ADB UI Read v1

This owner converts an already user-authorized Wireless ADB connection to the
physical server phone S into a bounded, read-only semantic receipt.

The runtime shape is:

```text
ordinary ChatGPT
-> RDC M
-> M Termux mcl-adb-ui
-> already-paired Wireless ADB
-> S uiautomator hierarchy
-> M-local parser
-> bounded receipt
```

The adapter is deliberately not a general ADB bridge.

## V1 commands

```text
./mcl-adb-ui status
./mcl-adb-ui snapshot
./mcl-adb-ui find-action --label "New chat"
./mcl-adb-ui find-editable
```

There is no click, tap, text-entry, install, uninstall, settings, or arbitrary
shell command in v1.

## Authorization boundary

Wireless Debugging pairing is user-controlled Android state. This owner does
not enable Wireless Debugging, enter pairing credentials, alter paired hosts,
or repair connectivity. It consumes an already paired and connected device.

The target resolves only when exactly one connected ADB device exists and its
model is exactly `SM-G998N`. The device serial/address never appears in a
normal receipt.

## Raw hierarchy containment

The raw hierarchy is written only to the fixed remote path:

`/data/local/tmp/mcl-adb-ui-v1.xml`

The controller reads that path directly into the M process, parses it locally,
and returns only fixed receipt fields. Raw XML, child stderr, unrelated visible
text, conversation content, account data, ADB serials, IP addresses, ports, and
pairing material are never emitted by normal commands.

Remote cleanup is best-effort and exposed only as
`cleanup=pass|fail|unknown`. Cleanup failure is not hidden.

## Semantic boundary

Only nodes whose package is exactly `com.openai.chatgpt` are eligible.
Password or credential/account-like nodes are excluded before semantic
accounting and exact-label matching.

The adapter never enumerates labels. `find-action` compares one caller-supplied
bounded exact label locally and returns only `0 / 1 / many` plus an opaque
handle for a unique match. `find-editable` returns the same bounded identity
shape for a unique editable node.

Opaque handles are derived from the current hierarchy snapshot and local node
index. A new hierarchy changes the snapshot identity. V1 does not consume
handles for mutation.

## Receipts

Snapshot output is fixed ordered `key=value` data:

```text
schema=mcl-wireless-adb-ui.v1
target=s
transport=wireless_adb
connection=<connected|offline|ambiguous|unknown>
model=<match|mismatch|unknown>
target_package=<present|absent|unknown>
snapshot=<opaque|none>
node_count=<bounded-int|unknown>
actionable_count=<bounded-int|unknown>
editable_count=<bounded-int|unknown>
cleanup=<pass|fail|unknown>
details=withheld
```

Find output returns only snapshot identity, query kind, role, bounded match
count, opaque handle, result, bounded cleanup disposition, and `details=withheld`.

## Security boundary

V1 intentionally excludes:
- caller-selected ADB serials or remote paths;
- arbitrary `adb shell`;
- package install/uninstall or package-manager mutation;
- Android settings writes;
- Play Protect or other security-control mutation;
- backup or app-private data access;
- input injection, raw coordinates, clicks, gestures, or text entry;
- helper APK installation.

The adapter is an observation surface only. Repository, Git, CI, merge,
release, production, ChatGPT account, and Android security authorities remain
with their existing owners.

## Test boundary

CI uses synthetic XML fixtures only and requires no Android device, pairing
credential, repository secret, or live ADB connection.

The first real-device proof for this owner is separately staged by #2453:
`status` and `snapshot` on the already paired M-to-S link, with no ChatGPT UI
mutation. Source/CI success alone is not live proof.
