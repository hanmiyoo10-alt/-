# S legacy local JSON bridge reversible retirement owner

This owner controls only the availability state of the fixed S-Termux
`llmgateway-bridge` runit service. That service is the old localhost
`127.0.0.1:39118` Local JSON adapter backed by
`$HOME/PocketRisu/generic_local_json_bridge.cjs`.

Current Usage Dashboard production uses the managed 39117 engine and 39119
manager. This owner does not modify either current runtime, the historical M
SSH forward for 39118, PocketRisu source, tokens, snapshots, logs, Android
state, S-Termux RDC, Tailscale or sshd.

## Fixed production identity

Production accepts only:

- service `$PREFIX/var/service/llmgateway-bridge`;
- run file SHA-256
  `2cfebd9bce0d5d1ae0cf17bafb17070815ae9328bd89ad1bd32613c87b79acaf`
  at mode 0700;
- source `$HOME/PocketRisu/generic_local_json_bridge.cjs`;
- source SHA-256
  `611dcf344df0a2b88c3138850b085e42ff6c7a109e69783a69607152744cdcdb`
  at mode 0644.

The owner hashes the fixed run/source files to verify identity. It never reads
token, snapshot or log content.

## Operations

All repository source files are mode 100644. Invoke explicitly:

```sh
sh ./mcl-s-legacy-local-json-bridge-retirement.sh --check
sh ./mcl-s-legacy-local-json-bridge-retirement.sh --deactivate
sh ./mcl-s-legacy-local-json-bridge-retirement.sh --activate
```

No caller-selected service, path, source, hash, port, token, command or
production timeout exists.

Exact active state is `run:` with no down marker. Exact retired state is
`down:` with a regular non-symlink mode-0600 down marker. Partial and foreign
states fail closed.

Deactivation creates only that down marker, calls fixed `sv down` once, then
observes until the fixed service reports `down:`. Observation never repeats
the effect. Activation removes only the managed marker, calls fixed `sv up`
once, then observes exact `run:`.

Test mode is restricted to
`/tmp/mcl-s-legacy-local-json-bridge-retirement-test-*`. It may provide
fixture hashes and shorten observation timing; those controls are unavailable
in production.

Live retirement belongs only to packet #3283 EXPERIMENT_CLOSE after fresh
Usage Dashboard manager/engine, S-Termux RDC, PocketRisu, Tailscale, sshd,
D-013 and continuity admission.
