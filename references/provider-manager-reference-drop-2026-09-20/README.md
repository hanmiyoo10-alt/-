# Provider Manager reference source drop — 2026-09-20

This directory archives two user-supplied Provider Manager JavaScript artifacts for future Local Usage Dashboard / shared AI usage observability redesign.

## Authority boundary

- Reference/archive only.
- Not runtime code.
- Not a production or release artifact.
- Not dependency approval.
- Not license or code-reuse permission.
- Does not make either external plugin a repository truth owner.
- Future implementation must re-read current project authority and independently justify any adopted behavior.

## Archived artifacts

| Reference | Stored filename | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Yumi Provider Manager v1.16.3 | `yumi-provider-manager-v1.16.3.js` | 1,018,363 | `b71e2b40bc64be0e12ff7be77b0345bcd2c065fc1f567ab5ab77a8dbf3136244` |
| 🧁CPM v1.35.11 production | `cupcake-provider-manager-v1.35.11-production.js` | 1,195,945 | `00ab4d10902b9c897c34f185ce8ff76267f4ab02e7225513fe6a9745075bb7e8` |

## Provenance

Both stored files are exact copies of the user-supplied source artifacts received on 2026-09-20.

Yumi's declared update URL was independently fetched on 2026-09-20 and matched the archived file byte-for-byte at the SHA-256 above.

CPM's current production endpoint had already advanced to v1.62.1 at intake time, so that live endpoint is not the byte authority for this archived v1.35.11 artifact. The user-supplied v1.35.11 file is the archive authority for this historical reference.

## Intended research use

The archive may be inspected for provider-neutral design patterns such as usage statistics, request identity, token/cache accounting, pricing/cost projection, quota/balance presentation, provider adapters, optional-source degradation, and read-only observability boundaries.

Concepts may inform future clean implementation. This archive alone does not authorize copying third-party implementation bytes into product runtime.

## Integrity

Run:

```bash
./VERIFY.sh
```

The verification checks both SHA-256 identity and exact byte count. `MANIFEST.json` records the same immutable identities.

Tracking:
- canonical-main idea: N-17 in #464
- shared observability idea: U-26 in #464
- migration design: #2582
- archive work packet: #2583

## Restore exact copies

To reconstruct working copies in another directory without changing the archived sources:

```bash
./RESTORE.sh /tmp/provider-manager-reference-restored
```

The restore script copies both archived source files and verifies their SHA-256 identities against `SHA256SUMS` before reporting success.
