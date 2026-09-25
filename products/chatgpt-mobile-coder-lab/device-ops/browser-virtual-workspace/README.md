# Mobile Coder Lab browser virtual workspace v1

This owner materializes the live-proven M browser-isolation recipe from #2933 as one bounded operator surface:

```sh
./mcl-browser-virtual-workspace start
./mcl-browser-virtual-workspace status
./mcl-browser-virtual-workspace stop
```

The purpose is to keep Android physical display 0 user-owned while browser automation uses a separate Android virtual display.

## Runtime shape

```text
ordinary ChatGPT
-> RDC M
-> mcl-browser-virtual-workspace
-> authorized M ADB device (fixed model SM-S938N)
-> scrcpy 4.1 new virtual display
-> separate ChromeTabbedActivity on display N
-> dedicated localhost CDP forward tcp:9223
-> Colab / Drive browser automation
```

The owner does not create Git, CI, merge, release, production, account, or browser-session authority.

## Fixed start contract

`start` first requires exactly one connected ADB device in `device` state, plus `scrcpy` and Python 3. The transport-list `model:` token is not model authority. After selecting the one internal ADB serial, the owner queries only `adb -s <internal> shell getprop ro.product.model` and requires the trimmed result to be exactly `SM-S938N`.

The scrcpy process shape is fixed:

```text
scrcpy -s <internally resolved device> \
  --new-display=720x1280/240 \
  --start-app=com.android.settings \
  --record=/dev/null \
  --record-format=mkv \
  --no-window \
  --no-audio \
  --no-clipboard-autosync \
  --no-power-on \
  --max-fps=5 \
  --video-bit-rate=1M
```

The `/dev/null` video sink is deliberate: current scrcpy requires a video pipeline for `--new-display`, while `--no-window` keeps the Termux host headless without accumulating a recording file.

After scrcpy reports exactly one nonzero new display id, the controller verifies both display 0 and the new display still exist. It then creates only the dedicated local CDP forward `tcp:9223 -> localabstract:chrome_devtools_remote` and launches one separate Chrome task on the new display using fixed Android activity flags:

```text
NEW_TASK | MULTIPLE_TASK | NEW_DOCUMENT
```

The only start URI is the fixed Colab root:

```text
https://colab.research.google.com/
```

There is no caller-selected package, display, URL, ADB serial, port, scrcpy argument, activity component, or Chrome flag.

## State boundary

The owner stores only bounded lifecycle state under:

```text
$HOME/.local/state/mcl-browser-virtual-workspace/
```

The state record contains only:
- fixed owner marker;
- local scrcpy PID;
- nonzero virtual display id;
- optional bounded CDP target id;
- UTC start timestamp;
- fixed local forward port.

It does not store or emit:
- ADB serial;
- account id or email;
- cookies or session material;
- browser history;
- unrelated page titles or URLs;
- authentication prompts or credentials;
- raw scrcpy/ADB/CDP output in normal receipts.

The scrcpy log is owner-private lifecycle material used only to parse the created display id. Normal receipts never forward it.

## Bounded receipts

Normal output is exactly:

```text
schema=mcl-browser-virtual-workspace.v1
operation=<start|status|stop>
state=<running|stopped|stale|blocked|unknown>
display_id=<nonzero integer|none|unknown>
owner_process=<running|absent|mismatch|unknown>
virtual_display=<present|absent|unknown>
chrome_task=<present|absent|unknown>
cdp=<reachable|unreachable|unknown>
bound_target=<present|absent|unknown>
details=withheld
```

A successfully formed `status` receipt is read-only. It does not activate tabs, launch activities, repair forwards, or recreate displays.

## Stop contract

`stop` acts only when the persisted state carries the exact v1 marker.

Before signaling a live PID, it verifies that `/proc/<pid>/cmdline` still matches the fixed scrcpy/new-display argument shape **and the currently resolved fixed-model ADB device**. A PID mismatch is `blocked` and executes no signal.

The stop path:
1. sends SIGINT only to the verified owner scrcpy PID;
2. waits for that process to exit;
3. waits for the recorded virtual display to disappear;
4. removes only the fixed tcp:9223 ADB forward;
5. removes only the bounded owner state/log files.

It never force-stops Chrome, kills all scrcpy processes, closes the user's physical browser task, or mutates display 0.

Stopping an already absent workspace is idempotent.

## Fail-closed behavior

Important blocked conditions include:
- zero or multiple connected ADB devices;
- unavailable, malformed, multi-line, or non-exact canonical `ro.product.model`;
- missing adb/scrcpy/python3;
- display 0 missing;
- any pre-existing nonzero Android display before owner start;
- tcp:9223 already occupied;
- existing owner state;
- scrcpy exits before display creation;
- missing/ambiguous display id;
- Chrome task missing on the virtual display;
- persisted state malformed;
- persisted PID no longer matches the fixed scrcpy shape.

There is deliberately no fallback to:
- physical display 0;
- CDP `Target.createTarget(background=true)`;
- raw coordinate automation;
- root or Shizuku;
- Secure Folder debugging;
- nested emulator/VM;
- alternate browser/package/URL.

If the virtual workspace cannot be proven, automation must stop instead of taking over the user's physical screen.

## Relationship to other M spaces

This owner solves only **UI foreground isolation**.

It does not replace:
- ordinary M Ubuntu PRoot for normal development;
- `mcl-private-lab` for credential-free userland/filesystem experiments;
- `mcl-vm-lab` for stronger guest-kernel isolation;
- Samsung Secure Folder for human-controlled app/account-data isolation.

These surfaces compose by semantic need and must not be collapsed into one generic sandbox.

## Validation

Repository validation:

```sh
python3 -m unittest discover \
  -s products/chatgpt-mobile-coder-lab/device-ops/browser-virtual-workspace/tests \
  -v

python3 -m py_compile \
  products/chatgpt-mobile-coder-lab/device-ops/browser-virtual-workspace/mcl_browser_virtual_workspace.py

sh -n   products/chatgpt-mobile-coder-lab/device-ops/browser-virtual-workspace/mcl-browser-virtual-workspace

shellcheck   products/chatgpt-mobile-coder-lab/device-ops/browser-virtual-workspace/mcl-browser-virtual-workspace
```

Source/CI proof is not live-device proof. The packet acceptance still requires one postmerge M `start -> status -> stop` cycle proving display 0 remains present and the nonzero virtual display is removed on stop.
