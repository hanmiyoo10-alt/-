# SimCore plugin idea/reference source drop — 2026-08-30

This directory archives six user-supplied plugin/reference artifacts for later idea analysis.

## Authority boundary

- Reference/archive only.
- Not SimCore runtime code.
- Not a dependency approval.
- Not a roadmap commitment.
- Does not modify `release-simcore`, `plugins/simcore/latest.js`, or `plugins/simcore/install.js`.
- The authoritative stored representation is `source-base64/` plus `SHA256SUMS` and `RESTORE.sh`.

## Archived artifacts

| Original label | Restored filename | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| 라이트보드 댓글창 4.0.0 | `lightboard-comments-4.0.0.charx` | 17,939 | `d6cb46311481c64d3bf8829cdb6f6a1b3e30cf68099035cc4b2aab80f494b8bf` |
| 라이트보드 미니보드 4.1.1 | `lightboard-miniboard-4.1.1.charx` | 25,559 | `dc3eb38d9b4195ccaaf079bb761aa4f5c35b489f761ac7ad1f6e034170341236` |
| 라이트보드 헌터넷 4.0.0 | `lightboard-hunternet-4.0.0.charx` | 23,160 | `ae7ecb090e5def555cfbef28b2e9c4d55b09ffaeb6443d9796ecc6d0b87f3f81` |
| 라이트보드 뉴스 4.0.0 | `lightboard-news-4.0.0.charx` | 29,320 | `9bef481204e87a3f8856074eea23e0f780ab43aa43b755de9069de8fc4bebe1d` |
| 라이트보드 본체 4.1.1 | `lightboard-core-4.1.1.charx` | 37,503 | `fd97f4dab7b5fd1749dc4984d723790485fe37d0b54b9140eb54b518a7d1d6f5` |
| risuai scripting skill | `risuai-scripting-skill.zip` | 38,522 | `bce7013f542b7947a48a192e971b7be20e2cea2d1061b4b9ea3e20ef79c90431` |

## Restore

From this directory:

```bash
./RESTORE.sh
```

or choose an output directory:

```bash
./RESTORE.sh /tmp/simcore-reference-restored
```

The script concatenates each lexically ordered base64 part, decodes the original bytes, then verifies every reconstructed artifact against `SHA256SUMS`.

## Transport note

The first scratch upload path used larger text chunks and exposed transfer-size drift. That scratch representation is non-authoritative and is intentionally not included here. The final source parts in this directory were admitted only after their Git blob SHA matched the locally computed Git blob SHA for the exact source slice. One truncated scripting chunk was rejected and replaced by two independently verified half-chunks.

The News 4.0.0 intake independently reconfirmed that larger text payloads can drift. Its rejected 2,000-character trial is not part of this tree; the authoritative News source uses forty independently verified base64 parts, with 1,000 characters per part except the final 96-character tail.
