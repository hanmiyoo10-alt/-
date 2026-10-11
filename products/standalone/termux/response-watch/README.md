# Termux GPT Response Watch

Prototype status: **NON-PRODUCTION**

A small Termux-side timer for GPT response sessions. While a session is active it refreshes one ongoing Android notification with elapsed time. When a completion signal arrives it turns that notification into a dismissible completion alert with the total duration.

## Commands

```bash
python response_watch.py start
python response_watch.py status
python response_watch.py done
python response_watch.py cancel
```

`start --replace` replaces an already-running local session. `start --no-notify` is a terminal-only development/test mode.

## Android notification dependency

Live Android notifications use Termux:API's public `termux-notification` command. The Termux:API app/bridge and the `termux-api` package must be available in the Termux environment.

The implementation deliberately reuses notification id `gpt-response-watch`; periodic refreshes therefore edit one notification instead of creating a notification storm.

## What this prototype does not do

It does **not** yet detect ChatGPT Android response completion automatically. OpenAI's public Android documentation does not expose a normal-response completion hook that this project can rely on. Automatic detection is a separate integration layer and remains `UNKNOWN` until real device evidence supports a stable method.

It also does not patch, re-sign, inspect private session data from, or modify the ChatGPT APK.

## State contract

Local state is stored at:

```text
~/.local/state/termux-response-watch/state.json
```

Override with `TERMUX_RESPONSE_WATCH_STATE_DIR` for tests or isolated runs.

Status values:

- `running`
- `done`
- `cancelled`
- `stale`

A dead daemon behind a nominal `running` state is converted to `stale` instead of being reported as healthy.
