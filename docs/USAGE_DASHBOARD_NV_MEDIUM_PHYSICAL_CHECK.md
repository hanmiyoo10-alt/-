# Usage Dashboard — NV medium measurement physical check

Status: **PHYSICAL EVIDENCE REQUIRED**

Current production at batch start: Product `3.0.0-alpha.5.81` · Engine `1.6.22` · Manager `1.3.0` · Managed CLI `1.9.0` · contracts `1/1`.

One PocketRisu session can close both remaining no-version / medium-difficulty / medium-importance ideas.

## A. Current Diagnostics

After PocketRisu is on 5.81, capture and return the full Local Usage Dashboard Diagnostics text.

This provides the current-production evidence for `NV-LOCAL-COST-MAP` and also supplies the ordinary 5.81 runtime acceptance evidence.

## B. Managed CLI filesystem footprint

In the same Android/Termux environment, measure the Manager-owned paths exactly:

```sh
ROOT="$HOME/.local/share/local-usage-dashboard/runtime/cli"
VER="$ROOT/1.9.0"
PKG="$VER/node_modules/@llmgateway/cli"
du -sk "$ROOT" "$VER" "$PKG" 2>&1
find "$VER/node_modules" -type f 2>/dev/null | wc -l
```

Return the output unchanged.

The command is read-only. It does not install, delete, update, or modify the runtime.

## Completion rule

After evidence is returned:
- record exact KiB values without conversion-based guessing;
- record file count as descriptive only;
- fill the 5.81 local-cost column from Diagnostics only;
- keep unavailable timings UNKNOWN;
- mark both ideas IMPLEMENTED in the canonical idea list;
- no product release is created for these measurement items.
