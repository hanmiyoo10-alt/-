# Termux Background GPT Prototype

A non-production Termux client that submits an OpenAI Responses API request with `background: true`, tracks only the response id and remote status locally, and uses Termux:API notifications for completion.

## Boundaries

- This is **not** a ChatGPT Android session bridge.
- It does not read ChatGPT cookies, account sessions, private app storage, or APK internals.
- It never stores the API key in repository files or state JSON.
- The prompt and final answer are not persisted in the local state file by this prototype.
- A dead local watcher is `stale`; it is **not** treated as proof that the remote response failed.
- No production release is authorized yet.

## Requirements

- Python 3.10+
- `OPENAI_API_KEY` in the environment
- `OPENAI_MODEL` or `--model`
- Optional: Termux:API app + `termux-api` package for Android notifications

No Python package dependency is required; the HTTP client uses the Python standard library.

## Commands

```sh
export OPENAI_API_KEY='...'
export OPENAI_MODEL='your-supported-model-id'

python background_gpt.py submit 'Write a long answer about ...'
python background_gpt.py status
python background_gpt.py status --refresh
python background_gpt.py result
python background_gpt.py cancel
python background_gpt.py resume
```

For a terminal-only prototype test:

```sh
python background_gpt.py submit --no-notify 'hello'
```

A prompt can also be piped through stdin:

```sh
printf '%s\n' 'your prompt' | python background_gpt.py submit --no-notify
```

## State contract

Default state path:

`~/.local/state/termux-background-gpt/state.json`

Override for tests:

`TERMUX_BACKGROUND_GPT_STATE_DIR=/tmp/...`

The state keeps identifiers and lifecycle metadata only. It distinguishes:

- remote status: `queued`, `in_progress`, `completed`, `failed`, `cancelled`, `incomplete`, or `unknown`
- local watcher status: `not_started`, `running`, `stale`, or `stopped`

## Important API note

Background mode is a server-side Responses API capability. It does not make the ChatGPT Android app itself run in the background and does not preserve a ChatGPT consumer-app conversation automatically.
