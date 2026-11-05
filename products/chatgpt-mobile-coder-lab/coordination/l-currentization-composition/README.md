# MCL L packet-currentization holder composition

Refs #3733 #4193 #4197 #4251.

This is the MCL-only composition boundary for packet-scoped L currentization.
It does not replace the repository-wide currentizer and it does not add MCL
semantics to `tools/repo-write/currentize_candidate.py`.

## Fixed effect sequence

```text
exact current packet body
+ exact active D-013 L/L lease
+ exact matching D-014 repository manifest
+ currentizer request bound to manifest branch/base
→ process-local workspace-holder claim
→ immediate holder check
→ fixed tools/repo-write/currentize_candidate.py
→ holder re-check
→ D-013 release/readback
→ exact holder release
→ D-014 COMPLETE receipt
```

The raw holder capability is generated inside this process. It is never a CLI
argument, stdout field, issue/PR field, or durable artifact.

## CLI

```text
node mcl-l-currentization-composition.cjs apply \
  --packet '#N' \
  --manifest /path/to/currentization-manifest.md \
  --ledger /path/to/current-ledger.md \
  --packet-file /path/to/current-packet-body.md \
  --request /path/to/currentizer-request.json \
  --apply
```

The currentizer request remains the existing repository-owned schema. This
composition adds only two MCL bindings before effect:

- `branch` must equal the D-014 manifest workspace branch;
- `expectedHead` must equal the D-014 manifest observed base.

The current main and generation base remain currentizer-owned evidence.

## Failure semantics

Missing, stale, released, mismatched or malformed D-013/D-014/holder evidence
fails closed before currentization. A pre-existing holder is never overwritten.

If the generic currentizer returns anything other than `CURRENT` or
`CURRENTIZED`, this composition does not manufacture D-013 release, holder
release, or D-014 completion. In particular, an unknown remote mutation result
preserves coordination state for explicit recovery.

## Authority boundary

This composition owns only the bounded coordination around one already-reviewed
packet-currentization effect. The generic currentizer still owns Git replay,
merge, preservation and non-force push semantics.

It grants no merge-to-main, release, production, runtime, device or security
authority and it does not create a new repository, lease, holder or D-014 truth
owner.
