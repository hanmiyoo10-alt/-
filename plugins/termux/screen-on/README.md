# Termux Screen ON Wrapper

Prototype status: **NON-PRODUCTION**

A narrow native-Termux wrapper around the real-device-verified broadcast surface exposed by EONSOFT Screen ON (`com.eonsoft.ScreenON`). It does not modify PocketRisu, change Android's global screen timeout, require self-ADB, or bypass the lock screen.

## Verified device contract

Issue #2194 established on the main Android device that:

- `com.eonsoft.ACTION_ADD_VIEW` resolves to `com.eonsoft.ScreenON/.ViewReceiver` and can keep the display awake after the Screen ON **Display over other apps** permission is enabled.
- `com.eonsoft.ACTION_REMOVE_VIEW` resolves to the same receiver and is the app's matching remove request.
- Broadcast completion alone is not proof that keep-awake is active. With overlay permission disabled, Android still reported `Broadcast completed: result=0` while the display later timed out normally.
- Ordinary Termux could not reliably query Screen ON's overlay app-op/effect state, so this wrapper preserves that state as `UNKNOWN` rather than inventing a status.

## Requirements

- Android user 0 on the currently verified device shape.
- EONSOFT Screen ON installed as package `com.eonsoft.ScreenON`.
- Screen ON's **Display over other apps** permission enabled before relying on keep-awake behavior.
- Python 3 in Termux.

## Commands

From the repository root:

```bash
python plugins/termux/screen-on/screen_on.py doctor
python plugins/termux/screen-on/screen_on.py setup
python plugins/termux/screen-on/screen_on.py on
python plugins/termux/screen-on/screen_on.py off
```

`doctor` is read-only. It verifies that the package exists and that both explicit receiver routes resolve. It reports overlay permission and keep-awake readiness as `UNKNOWN`, because ordinary Termux cannot prove those states reliably.

`setup` opens Android's package-specific overlay-permission screen for Screen ON. The user must enable **Display over other apps** there; the wrapper does not grant the permission itself.

`on` performs package/receiver preflight and then sends the explicit `ACTION_ADD_VIEW` broadcast. A successful command reports only activity-manager transport success and keeps `keep_awake=UNKNOWN`.

`off` performs the corresponding explicit `ACTION_REMOVE_VIEW` request. It does not claim that the resulting overlay state was independently observed.

A `status` command is intentionally absent until a reliable, least-privilege observation surface exists.

## Tests

```bash
python -m unittest discover -s plugins/termux/screen-on/tests -p 'test_*.py'
```

The tests use an injected command runner. They verify the exact package/receiver/action wiring, fail-closed behavior, setup intent, and the contract that transport success must not be promoted into a fabricated keep-awake status.

## Release boundary

The Termux route still has no established production release branch or production manifest. This directory is therefore an implementation prototype only and does not establish a production/update authority.
