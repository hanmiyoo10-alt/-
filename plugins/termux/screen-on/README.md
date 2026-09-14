# Termux Screen On Controller

Prototype status: **NON-PRODUCTION**

This directory owns the Termux-controlled Android display keep-awake experiment. The existing EONSOFT Screen ON route remains the default verified backend while issue #2202 validates a repository-owned Android companion.

## Backends

### `eonsoft` (default, verified fallback)

`com.eonsoft.ACTION_ADD_VIEW` / `ACTION_REMOVE_VIEW` target `com.eonsoft.ScreenON/.ViewReceiver`. Issue #2194 verified physical keep-awake behavior on the main phone after the user granted **Display over other apps**.

Broadcast completion alone is not proof of effect for this backend, so overlay permission and resulting keep-awake state stay `UNKNOWN` in the wrapper.

### `companion` (repo-owned candidate)

`plugins/termux/screen-on/android-companion/` is a minimal Android app owned by this repository. It creates a 1 x 1 `TYPE_APPLICATION_OVERLAY` window carrying `FLAG_KEEP_SCREEN_ON`, `FLAG_NOT_FOCUSABLE`, and `FLAG_NOT_TOUCHABLE`.

It deliberately does not request INTERNET, use `FLAG_TURN_SCREEN_ON`, mutate Android's global timeout, require root/self-ADB, or bypass the lock screen. The exported command receiver is protected by `com.termux.permission.RUN_COMMAND`; real-device validation must prove this gate before the backend can replace EONSOFT.

## Commands

The existing verified route remains unchanged by default:

```bash
python plugins/termux/screen-on/screen_on.py doctor
python plugins/termux/screen-on/screen_on.py setup
python plugins/termux/screen-on/screen_on.py on
python plugins/termux/screen-on/screen_on.py off
```

The repo-owned candidate is always explicit during parity testing:

```bash
python plugins/termux/screen-on/screen_on.py --backend companion doctor
python plugins/termux/screen-on/screen_on.py --backend companion setup
python plugins/termux/screen-on/screen_on.py --backend companion on
python plugins/termux/screen-on/screen_on.py --backend companion status
python plugins/termux/screen-on/screen_on.py --backend companion off
```

`setup` opens the package-specific Android overlay-permission page. The user must grant **Display over other apps** manually.

For the companion backend, ON/OFF/STATUS use distinct ordered-broadcast result codes. An attached overlay is stronger evidence than transport success, but `keep_awake_effect` remains `UNKNOWN` until the main phone passes the same physical timeout observation used for #2194.

## Tests

```bash
python -m unittest discover -s plugins/termux/screen-on/tests -p 'test_*.py'
```

The companion build is validated by `.github/workflows/screen-on-android-companion.yml`, which runs the Python regression suite, Android unit tests, and a debug APK build.

## Dependency-removal boundary

Do **not** uninstall EONSOFT Screen ON merely because the companion source builds. The third-party app remains the verified fallback until #2202 records:

1. Termux can invoke the permission-protected companion receiver;
2. overlay permission failure is surfaced correctly;
3. the companion overlay stays attached and keeps the physical display awake past the normal timeout;
4. OFF removes the overlay and restores normal timeout behavior.

## Release boundary

The Termux route still has no established production release branch, production manifest, or deployment authority. Source merge or a debug APK does not establish production deployment.
