# Termux Screen On Controller

Prototype status: **NON-PRODUCTION**

This directory owns the Termux-controlled Android display keep-awake experiment. The existing EONSOFT Screen ON route remains the default verified backend while issue #2202 validates a repository-owned Android companion.

## Backends

### `eonsoft` (default, verified fallback)

`com.eonsoft.ACTION_ADD_VIEW` / `ACTION_REMOVE_VIEW` target `com.eonsoft.ScreenON/.ViewReceiver`. Issue #2194 verified physical keep-awake behavior on the main phone after the user granted **Display over other apps**. Broadcast completion alone is not proof of effect, so the wrapper keeps that effect state `UNKNOWN`.

### `companion` (repo-owned candidate)

`android-companion/` owns a 1 x 1 `TYPE_APPLICATION_OVERLAY` carrying `FLAG_KEEP_SCREEN_ON`, `FLAG_NOT_FOCUSABLE`, and `FLAG_NOT_TOUCHABLE`. It does not request INTERNET, use `FLAG_TURN_SCREEN_ON`, mutate Android's global timeout, require root/self-ADB, or bypass the lock screen.

The companion uses explicit user-approved capability pairing instead of reusing Termux's inbound `RUN_COMMAND` permission. `setup` generates a 256-bit token in Termux private storage and opens the companion pairing activity. The companion stores that token only after the user taps **Allow Termux control**. ON/OFF/STATUS reject missing or mismatched tokens.

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
python plugins/termux/screen-on/screen_on.py --backend companion on
python plugins/termux/screen-on/screen_on.py --backend companion status
python plugins/termux/screen-on/screen_on.py --backend companion off
```

For companion setup, tap **Allow Termux control** and then **Open Display over other apps** to grant the Android overlay permission. The local token is stored at `~/.config/termux-screen-on/companion-token` with mode 0600. Reinstalling or clearing the companion invalidates pairing until setup is repeated.

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
