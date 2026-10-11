# Termux Screen On Controller

Prototype status: **NON-PRODUCTION**

This directory owns the Termux-controlled Android display keep-awake route. The repository-owned Android companion is the default backend after real-device pairing, keep-awake, and OFF-restoration parity was proven on device M. EONSOFT Screen ON remains available only as an explicit compatibility fallback.

## Backends

### `companion` (default, repo-owned)

`android-companion/` owns a 1 x 1 `TYPE_APPLICATION_OVERLAY` carrying `FLAG_KEEP_SCREEN_ON`, `FLAG_NOT_FOCUSABLE`, and `FLAG_NOT_TOUCHABLE`. It does not request INTERNET, use `FLAG_TURN_SCREEN_ON`, mutate Android's global timeout, require root/self-ADB, or bypass the lock screen.

The companion uses explicit user-approved capability pairing instead of reusing Termux's inbound `RUN_COMMAND` permission. The user opens the companion from the Android launcher and the app immediately shows a one-time pairing code. `setup --pair-code CODE` then sends that single-attempt, two-minute code together with a fresh 256-bit capability token. The companion stores the capability token only after the code is accepted, and Termux writes its private token file only after the paired acknowledgement. ON/OFF/STATUS reject missing or mismatched capability tokens.

### `eonsoft` (explicit compatibility fallback)

`com.eonsoft.ACTION_ADD_VIEW` / `ACTION_REMOVE_VIEW` target `com.eonsoft.ScreenON/.ViewReceiver`. Issue #2194 verified physical keep-awake behavior on the main phone. This route is no longer the source default; use `--backend eonsoft` only when the repo-owned companion is unavailable or a rollback comparison is required.

## Commands

The repo-owned companion is now the default route:

```bash
python plugins/termux/screen-on/screen_on.py doctor
python plugins/termux/screen-on/screen_on.py diagnostic
python plugins/termux/screen-on/screen_on.py setup
# Open the companion app; it shows the one-time pairing code automatically, then:
python plugins/termux/screen-on/screen_on.py --pair-code 12345678 setup
python plugins/termux/screen-on/screen_on.py on
python plugins/termux/screen-on/screen_on.py status
python plugins/termux/screen-on/screen_on.py off
```

EONSOFT remains an explicit compatibility fallback:

```bash
python plugins/termux/screen-on/screen_on.py --backend eonsoft doctor
python plugins/termux/screen-on/screen_on.py --backend eonsoft setup
python plugins/termux/screen-on/screen_on.py --backend eonsoft on
python plugins/termux/screen-on/screen_on.py --backend eonsoft off
```

EONSOFT does not provide reliable `status` or startup `diagnostic` receipts through this controller.

For companion setup, run `setup` once to get the instructions, then open **Termux Screen On Companion** from the Android launcher. Opening the app is the explicit user action that arms and displays the one-time pairing code; no Generate-button tap is required. Reopening the app within the same two-minute window reuses the same still-valid pending code instead of rotating it. The pairing screen hides non-system overlays on Android 12+. The code is valid for two minutes and one pairing attempt. After pairing, tap **Open Display over other apps** in the companion and grant the Android overlay permission. The long-lived capability token is stored at `~/.config/termux-screen-on/companion-token` with mode 0600. Do not record pairing codes or capability tokens in Git. Reinstalling or clearing the companion invalidates pairing until setup is repeated.

`diagnostic` is intentionally available before pairing and returns only a fixed sanitized `startup_phase` receipt. It sends no capability token and cannot mutate overlay or pairing state. `doctor` includes the same startup phase before the normal status summary. PAIR/ON/OFF/STATUS keep their existing capability-token boundary. Real-device parity on M proved that an attached companion overlay keeps the physical display awake past the normal timeout and that OFF restores normal automatic screen-off. Individual machine receipts still keep `keep_awake_effect=UNKNOWN` while ON because ordinary Termux cannot independently read panel state.

On the tested Android 16 device, `pm path` / `cmd package` can transiently fail with a Binder `Failed transaction` even while an explicit component broadcast is healthy. For the repo-owned companion only, that exact transient preflight failure may fall through to one explicit `cmd activity broadcast -n io.hanmiyoo.screenoncompanion/.ScreenOnReceiver` attempt. Real package absence and non-transient preflight failures remain fail-closed. PAIR transport itself is never retried automatically, because the one-time code is consumed by an actual pairing attempt.

## Tests

```bash
python -m unittest discover -s plugins/termux/screen-on/tests -p 'test_*.py'
```

The companion workflow runs Python regression tests, Android unit tests, and a debug APK build.

## Dependency-removal boundary

Source-default promotion does **not** authorize uninstalling EONSOFT Screen ON. The app may remain installed as a rollback/compatibility fallback even though ordinary controller commands no longer depend on it. Actual package retirement requires separate device/release/deployment authority.

## Release boundary

The Termux route still has no established production release branch, production manifest, or deployment authority. Source merge or a debug APK does not establish production deployment.
