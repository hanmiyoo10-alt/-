# Termux Screen On Controller

Prototype status: **NON-PRODUCTION**

This directory owns the Termux-controlled Android display keep-awake experiment. The existing EONSOFT Screen ON route remains the default verified backend while issue #2202 validates a repository-owned Android companion.

## Backends

### `eonsoft` (default, verified fallback)

`com.eonsoft.ACTION_ADD_VIEW` / `ACTION_REMOVE_VIEW` target `com.eonsoft.ScreenON/.ViewReceiver`. Issue #2194 verified physical keep-awake behavior on the main phone after the user granted **Display over other apps**. Broadcast completion alone is not proof of effect, so the wrapper keeps that effect state `UNKNOWN`.

### `companion` (repo-owned candidate)

`android-companion/` owns a 1 x 1 `TYPE_APPLICATION_OVERLAY` carrying `FLAG_KEEP_SCREEN_ON`, `FLAG_NOT_FOCUSABLE`, and `FLAG_NOT_TOUCHABLE`. It does not request INTERNET, use `FLAG_TURN_SCREEN_ON`, mutate Android's global timeout, require root/self-ADB, or bypass the lock screen.

The companion uses explicit user-approved capability pairing instead of reusing Termux's inbound `RUN_COMMAND` permission. The user opens the companion from the Android launcher and the app immediately shows a one-time pairing code. `setup --pair-code CODE` then sends that single-attempt, two-minute code together with a fresh 256-bit capability token. The companion stores the capability token only after the code is accepted, and Termux writes its private token file only after the paired acknowledgement. ON/OFF/STATUS reject missing or mismatched capability tokens.

## Commands

The verified EONSOFT route remains unchanged by default:

```bash
python plugins/termux/screen-on/screen_on.py doctor
python plugins/termux/screen-on/screen_on.py setup
python plugins/termux/screen-on/screen_on.py on
python plugins/termux/screen-on/screen_on.py off
```

The repo-owned candidate remains explicit during parity testing:

```bash
python plugins/termux/screen-on/screen_on.py --backend companion doctor
python plugins/termux/screen-on/screen_on.py --backend companion setup
# Open the companion app; it shows the one-time pairing code automatically, then:
python plugins/termux/screen-on/screen_on.py --backend companion --pair-code 12345678 setup
python plugins/termux/screen-on/screen_on.py --backend companion on
python plugins/termux/screen-on/screen_on.py --backend companion status
python plugins/termux/screen-on/screen_on.py --backend companion off
```

For companion setup, run `setup` once to get the instructions, then open **Termux Screen On Companion** from the Android launcher. Opening the app is the explicit user action that arms and displays the one-time pairing code; no Generate-button tap is required. Reopening the app within the same two-minute window reuses the same still-valid pending code instead of rotating it. The pairing screen hides non-system overlays on Android 12+. The code is valid for two minutes and one pairing attempt. After pairing, tap **Open Display over other apps** in the companion and grant the Android overlay permission. The long-lived capability token is stored at `~/.config/termux-screen-on/companion-token` with mode 0600. Do not record pairing codes or capability tokens in Git. Reinstalling or clearing the companion invalidates pairing until setup is repeated.

ON/OFF/STATUS use distinct ordered-broadcast result codes. An attached overlay is stronger evidence than transport success, but `keep_awake_effect` remains `UNKNOWN` until the main phone passes the same physical timeout observation used for #2194.

## Tests

```bash
python -m unittest discover -s plugins/termux/screen-on/tests -p 'test_*.py'
```

The companion workflow runs Python regression tests, Android unit tests, and a debug APK build.

## Dependency-removal boundary

Do **not** uninstall EONSOFT Screen ON until #2202 records all of the following: companion pairing/auth works on the real device; overlay permission denial is surfaced correctly; ON keeps the physical display awake past timeout; and OFF restores normal timeout behavior.

## Release boundary

The Termux route still has no established production release branch, production manifest, or deployment authority. Source merge or a debug APK does not establish production deployment.
