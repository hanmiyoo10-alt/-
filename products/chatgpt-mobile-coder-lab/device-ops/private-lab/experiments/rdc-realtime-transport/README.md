# RDC Realtime transport observer experiment

This subtree implements #2325 as a credential-free PRIVATE LAB experiment only.
It does not instrument live `S`, patch RDC, change provider/session state, or own the existing RDC vendor target.

## Contract

The probe accepts no runtime arguments and uses only the fixed managed root:

`/opt/mcl-private-lab/vendor/rdc-session-rotation`

Before interpretation it requires all of these exact public identities:

- `@wonderwhy-er/desktop-commander` `0.2.50`
- `@supabase/realtime-js` `2.116.0`
- `@supabase/phoenix` `0.4.5`
- `ws` `8.21.3`

Missing or mismatched identity is `blocked`. The experiment never installs, updates, repairs, cleans, or writes that target.
A pack-only RDC target without the required transitive dependency closure therefore remains blocked rather than being repaired here.

## Deterministic observation

`probe.mjs` loads the exact Realtime client only after identity validation and supplies an in-memory synthetic transport.
The transport never opens a network connection.
It injects one fixed code-less error event followed by one fixed close event with code `1012` and a fixed non-sensitive reason.
The observer keeps only event class plus numeric close code and cleanliness; raw objects and reason text are never outward evidence.

A passing synthetic contract requires:

1. the subscription callback reports a generic transport failure on the first event;
2. the channel enters the errored state;
3. the later close code never reappears through the subscription error view;
4. the transport/logger observation retains `error`, then `close` with code `1012` and `wasClean=false`;
5. enabling the optional Realtime logger does not change the channel state or rejoin/reconnect outcome.

The only outward result is exactly:

```text
schema=mcl-private-check.v1
check=rdc-realtime-transport-observer
result=<pass|fail|blocked|unknown>
details=withheld
```

`pass` proves only the declared synthetic observer contract on the exact tested public dependency baseline.
It does not identify the cause of any natural S outage or authorize live instrumentation.

## Stage boundary

`test-probe.mjs` and `test-run-contract.sh` are repository/synthetic validation for `IMPLEMENTATION_PR`.
Do not execute `run.sh` as part of this stage; a later authorized M PRIVATE LAB experiment is a separate stage.
`run.sh` itself has no arguments, enters only `mcl-private-lab` through `proot-distro login --isolated`, suppresses child diagnostics, and forwards only a validated four-line receipt.
