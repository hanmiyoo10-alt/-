# Mobile Coder Lab Wireless ADB UI v1

This owner converts an already user-authorized Wireless ADB connection to the
physical server phone S into bounded semantic receipts and, only through the
reviewed action extension, a very small fail-closed GUI effect surface.

The runtime shape is:

```text
ordinary ChatGPT
-> RDC M
-> M Termux mcl-adb-ui
-> already-paired Wireless ADB
-> S uiautomator hierarchy
-> M-local semantic resolution
-> bounded receipt / bounded action
```

The adapter is deliberately not a general ADB bridge.

## Read-only compatibility surface

The #2453 read-only commands and receipt schemas remain compatible:

```text
./mcl-adb-ui status
./mcl-adb-ui snapshot
./mcl-adb-ui find-action --label "New chat"
./mcl-adb-ui find-editable
```

These commands do not inject input.

## Reviewed action surface

The separately reviewed action extension adds only:

```text
./mcl-adb-ui launch-target
./mcl-adb-ui find-alias --alias new_chat
./mcl-adb-ui find-alias --alias send
./mcl-adb-ui activate --snapshot <opaque> --handle <opaque>
./mcl-adb-ui type-ascii --snapshot <opaque> --handle <opaque> --text <bounded-ascii>
./mcl-adb-ui wait-text --exact <bounded-ascii>
```

The separately reviewed new-chat discovery repair also adds one read-only
diagnostic:

```text
./mcl-adb-ui probe-new-chat
```

There is no caller-supplied coordinate, ADB serial, package, component, remote
path, or arbitrary shell command.

## Authorization boundary

Wireless Debugging pairing is user-controlled Android state. This owner does
not enable Wireless Debugging, enter pairing credentials, alter paired hosts,
or repair connectivity.

The target resolves only when exactly one connected ADB device exists and its
model is exactly `SM-G998N`. The target package is fixed to
`com.openai.chatgpt`.

## Raw hierarchy containment

The raw hierarchy is written only to the fixed remote path:

`/data/local/tmp/mcl-adb-ui-v1.xml`

The controller reads that path into the M process, parses it locally, and emits
only fixed receipt fields. Raw XML, child stderr, unrelated visible text,
conversation content, account data, ADB serials, IP addresses, ports, pairing
material, node bounds, and derived coordinates are never normal output.

Remote cleanup is best-effort and exposed only as
`cleanup=pass|fail|unknown`.

## Semantic boundary

Only nodes whose package is exactly `com.openai.chatgpt` are eligible.
Password or credential/account-like nodes are excluded before semantic
matching.

Opaque handles bind a semantic role and node index to one hierarchy snapshot.
A later hierarchy has a different snapshot identity.

The fixed action aliases are:

```text
new_chat -> New chat | 새 채팅 | 새 대화
send     -> Send | 보내기
```

Alias absence remains `not_found`; multiple eligible matches remain
`ambiguous`. The alias table is not proof of the current live UI vocabulary.

For `new_chat` only, semantic discovery may also use one fixed structural
channel. A target-package Android resource id is parsed locally only when it
has the exact `com.openai.chatgpt:id/<local-name>` shape. The local name must
exactly equal one reviewed value:

```text
new_chat
new_chat_button
newchat
new_conversation
new_conversation_button
create_new_chat
start_new_chat
```

There is no substring or fuzzy matching. Label and structural matches are
deduplicated before the normal 0 / 1 / many decision. `send` remains
label-only.

For `new_chat` only, exact reviewed semantic evidence may be carried by a
non-clickable child of the actual clickable affordance. The adapter preserves a
bounded internal parent link for same-package, non-sensitive nodes and may lift
that exact evidence to the nearest actionable ancestor within at most two
parent hops. A package boundary or sensitive ancestor breaks the link, deeper
evidence does not match, and multiple semantic sources mapping to the same
actionable ancestor count once. No ancestry/class/path data is emitted.

`probe-new-chat` captures one fresh hierarchy and returns only the snapshot,
bounded label/resource/combined match counts, an opaque handle for exactly one
combined match, bounded result/cleanup dispositions, and
`details=withheld`. It never emits visible labels, resource ids, classes,
bounds, coordinates, or raw XML, and it performs no UI input.

## Stale-guarded activation

`activate` captures a fresh hierarchy before any effect. The caller-supplied
opaque snapshot must equal that fresh hierarchy, and the opaque handle must
resolve to exactly one eligible actionable node.

Only then may the adapter parse the node's Android bounds locally, validate
them, derive the integer center point, and issue one fixed input tap.

A stale snapshot, missing/ambiguous handle, invalid bounds, offline target, or
model mismatch executes no tap.

The bounds and derived x/y values never cross the receipt boundary.

## Bounded ASCII entry

`type-ascii` accepts only 1..160 characters from:

```text
A-Z a-z 0-9 _ and ordinary space
```

Unicode, punctuation outside that allowlist, percent, quotes, controls,
newlines, and tabs are rejected before ADB mutation.

Typing requires all of the following:

1. fresh snapshot equality;
2. exactly one eligible editable handle;
3. empty editor before focus;
4. internally derived one-point focus tap;
5. exactly one focused eligible editor that is still empty;
6. one fixed Android input-text argv call with spaces encoded internally;
7. a fresh hierarchy showing exactly one focused eligible editor whose text is
   exactly equal to the original caller text.

Only that final exact check yields `verified=pass`.

The caller text is not echoed in receipts.

## Exact visible wait

`wait-text --exact` uses the same bounded ASCII policy and a fixed maximum
poll count. It matches only exact text/content-description values on eligible
non-sensitive ChatGPT nodes and never enumerates unrelated UI text.

## Fixed landing routes

`launch-landing --route` accepts only the repository-owned enum:

```text
root     -> https://chatgpt.com/
open_app -> https://chatgpt.com/open-app
```

The URI is never caller input. Before any landing effect, the adapter performs
a package-restricted VIEW/BROWSABLE resolver and requires exactly
`com.openai.chatgpt/.ChatGptDeeplinkActivity`. Missing, malformed,
ambiguous, other-package, or other-component resolution executes no landing
launch. Normal receipts expose the route enum but never the URI or resolved
component.

## Fixed effect allowlist

The ordinary launch path first performs one fixed read-only resolver for
`com.openai.chatgpt` MAIN/LAUNCHER metadata. It accepts exactly one component
owned by that package and never emits the resolved component in a receipt.

The only effect primitives owned here are equivalent to:

```text
adb -s <resolved-S> shell am start
  -a android.intent.action.MAIN
  -c android.intent.category.LAUNCHER
  -n <validated-com.openai.chatgpt-component>

adb -s <resolved-S> shell am start
  -a android.intent.action.VIEW
  -c android.intent.category.BROWSABLE
  -d <fixed-root-or-open-app-uri>
  -n com.openai.chatgpt/.ChatGptDeeplinkActivity

adb -s <resolved-S> shell input tap <internally-derived-x> <internally-derived-y>

adb -s <resolved-S> shell input text <strictly-encoded-bounded-ascii>
```

They are constructed as argv arrays, not through a shell. A missing,
malformed, ambiguous, or disallowed resolved component blocks the corresponding
launch without trying a browser, external package, or alternate launcher
mechanism.

## Forbidden effects

V1 does not expose:

- arbitrary `adb shell`;
- caller-selected coordinates, serials, paths, packages, components, actions,
  or categories;
- swipe, gesture, long-press, keyevent, clipboard, or paste;
- package install/uninstall/clear/force-stop;
- Android settings, permission, or app-op mutation;
- Play Protect or other security-control mutation;
- backup/database/app-private-data access;
- unlock/PIN/password/biometric interaction;
- login/account automation;
- helper APK installation.

## Receipt boundary

Read-only receipt schemas from #2453 remain unchanged.

New action receipts expose only bounded dispositions such as:

```text
freshness=pass|stale|unknown
target_match=unique|none|ambiguous|unknown
focus=pass|fail|unknown
injection=pass|fail|unknown
verified=pass|fail|unknown
transition=changed|same|unknown
result=<bounded enum>
details=withheld
```

No action receipt contains raw hierarchy, node labels beyond fixed alias names,
node bounds, x/y coordinates, ADB identity, or caller-entered text.

## Test and live-proof boundary

CI uses synthetic XML fixtures only. It requires no Android device, pairing
credential, repository secret, or live ADB action.

#2453 separately proved the read-only bounded receipt path. #2455 owns the
action implementation and its later single harmless live acceptance probe.
Source/CI success does not by itself prove live action fidelity.

The action live proof must stop on stale/ambiguous/missing nodes, exact text
verification failure, or platform safety blocking. It must not fall back to
manual coordinates, screenshot-vision tapping, clipboard, keyevents, alternate
encodings, or a wider ADB shell.
