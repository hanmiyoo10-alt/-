# SimCore v0.66.0 Builder Validation Failure 01 — Slice B Assertion Overmatch

Date: 2026-08-29

Classification:

```text
FIX / BUILD_ASSERTION / NON_RUNTIME / PRODUCTION_UNCHANGED
```

## Trigger

Temporary read-only builder validation run:

```text
run 33199422806
job validate
```

The workflow first proved the exact production input:

```text
release-simcore commit = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
latest blob             = 1b38e2b2874f2581edae8f1080edc39558febefa
install blob            = 1b38e2b2874f2581edae8f1080edc39558febefa
latest == install       = YES
builder SHA256          = d87afb81ef5f80e95f8e80a7b62492578b35a239d1519ab06979021128495024
```

The builder then stopped with:

```text
06600_SLICE_B_SESSION_HOUSEKEEPING_REMAINS
```

## Root cause

The builder correctly changes the Session call site to:

```text
this.store.scheduleDeferredPrune(outIndex)
```

but its own post-build assertion searched Session for the unqualified substring:

```text
scheduleDeferredPrune(outIndex)
```

That substring is intentionally present inside the delegated Store call. The assertion therefore conflated:

```text
forbidden Session-owned method definition
```

with:

```text
required Session → Store housekeeping delegation
```

## Disposition

This is not evidence of a runtime ownership regression.

Required fix:

```text
match the Session-owned method definition shape only
for example:
"\n  scheduleDeferredPrune(outIndex) {"
```

Keep all Slice B runtime transformations unchanged unless later validation proves an independent defect.

## Safety

```text
release-simcore mutation = NONE
production exposure      = NONE
candidate publication    = NONE
runtime execution        = NONE
```

No other slice is re-designed by this failure.
