# Provider Manager reference source drop — 2026-09-20

This directory preserves exact historical and latest-observed Provider Manager JavaScript references for future Local Usage Dashboard / shared AI usage observability redesign.

## Authority boundary

- Reference/archive only.
- Not runtime code.
- Not a production or release artifact.
- Not dependency approval.
- Not license or code-reuse permission.
- Does not make either external plugin a repository truth owner.
- `LATEST_OBSERVED.json` is only an external-reference selection captured at an observation time; it is not repository product/runtime/release authority.
- Future implementation must re-read current project authority and independently justify any adopted behavior.

## Latest observed reference pair

Observed on 2026-09-20:

| Family | Latest observed reference | Stored filename | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| Yumi | v1.16.3 | `yumi-provider-manager-v1.16.3.js` | 1,018,363 | `b71e2b40bc64be0e12ff7be77b0345bcd2c065fc1f567ab5ab77a8dbf3136244` |
| 🧁CPM | v1.62.1 | `cupcake-provider-manager-v1.62.1-production.js` | 1,727,902 | `f71593e7821e09c7812c34f5654c29312cc80c780532e6a752ea16732411826a` |

Use `LATEST_OBSERVED.json` when future design work needs the latest-observed pair from this archive.

## Archived artifacts

| Reference | Stored filename | Role |
| --- | --- | --- |
| Yumi Provider Manager v1.16.3 | `yumi-provider-manager-v1.16.3.js` | latest observed + original exact reference |
| 🧁CPM v1.35.11 production | `cupcake-provider-manager-v1.35.11-production.js` | historical exact reference |
| 🧁CPM v1.62.1 production | `cupcake-provider-manager-v1.62.1-production.js` | latest observed exact reference |

The historical CPM v1.35.11 file is intentionally retained so future analysis can compare the older user-supplied reference against the later official upstream reference.

## Provenance

Yumi v1.16.3 was user-supplied and its declared official update URL independently matched the archived bytes both at initial intake and at this latest refresh.

CPM v1.35.11 remains the exact user-supplied historical reference.

CPM v1.62.1 was fetched from the official upstream main-plugin endpoint. The official `/api/versions` metadata independently reported version `1.62.1`, size `1,727,902`, and SHA-256 `f71593e7821e09c7812c34f5654c29312cc80c780532e6a752ea16732411826a`, matching the downloaded body.

## Intended research use

The archive may be inspected for provider-neutral design patterns such as usage statistics, request identity, token/cache accounting, pricing/cost projection, quota/balance presentation, provider adapters, optional-source degradation, and read-only observability boundaries.

Concepts may inform future clean implementation. This archive alone does not authorize copying third-party implementation bytes into product runtime.

## Integrity

Run:

```bash
./VERIFY.sh
```

The verification checks SHA-256 identity, exact byte counts, and JSON metadata syntax for the full archive.

## Restore exact copies

To reconstruct all archived JavaScript references in another directory without modifying the archive:

```bash
./RESTORE.sh /tmp/provider-manager-reference-restored
```

The restore script copies all archived source files and verifies them against `SHA256SUMS` before reporting success.

## Tracking

- canonical-main idea: N-17 in #464
- shared observability idea: U-26 in #464
- migration design: #2582
- initial archive packet: #2583
- latest refresh packet: #2587
