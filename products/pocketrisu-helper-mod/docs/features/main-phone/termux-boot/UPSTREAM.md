# Upstream PR dossier - termux-boot

Feature-ID: `termux-boot`
Area: `main-phone`
PR status: `IMPLEMENTATION_PR / #3306`
Isolation status: `ISOLATED LEGACY-20 RETIREMENT`
Deployment status: `NOT_APPLIED / MERGE+POSTMERGE REQUIRED`

## Problem / motivation

2026-10-07 물리 M reboot에서 Termux:Boot는 실행됐지만 device-only legacy `20-pocketrisu-ssh-tunnel`이 broad shared Termux service supervisor를 다시 생성했다.

같은 reboot에서 PocketRisu/Tailscale 측 child supervision은 이후 소실했고 RDC guard는 생존했다. 이 모양은 #3231 failure class와 호환되지만 이번 incident의 직접 kill cause는 증명되지 않았으므로 `UNKNOWN`을 유지한다.

현재 healthy recovered topology는 shared top-level supervisor 없이도 기존 `21-pocketrisu-core-supervisor-guard`가 PocketRisu tunnel을 독립 복구해 localhost HTTP 200 / ready를 유지할 수 있음을 실기기에서 증명했다.

## Minimal upstream scope

#3306은 정확히 다음 repository paths만 소유한다.

- `README.md`
- `UPSTREAM.md`
- `FAILURES.md`
- `files/retire-legacy-20.sh`
- `tests/test-retire-legacy-20.sh`

Runtime effect는 M의 exact legacy Boot entry 하나를 reversible fixed archive로 이동하는 것뿐이다.

## Owner contract

Production owner:

```sh
sh files/retire-legacy-20.sh --check
sh files/retire-legacy-20.sh --apply
```

- production active/archive path는 고정.
- production expected legacy bytes는 observed SHA-256 constant로 고정.
- production expected mode는 700.
- replacement `21`은 regular executable 존재만 확인하고 수정하지 않음.
- symlink, foreign bytes, wrong mode, duplicate active/archive, missing replacement는 fail closed.
- apply는 delete가 아니라 fixed move.
- already-retired exact state는 idempotent no-op.
- fixture relocation/hash override는 explicit test mode에서만 허용.

## Dependencies

- parent incident #3305
- topology owner #3232
- #3231은 historical failure-class comparison only
- service inventory #3252
- existing main-ssh-tunnel guard/anchor owner

No M Tailscale/RDC source changes and no S PocketRisu changes are part of this feature.

## Verification evidence

AUTHORITY_SCOPE evidence:

- M Termux:Boot trace proves Boot ran.
- legacy `20` boot ledger proves shared supervisor ready + tunnel ready on the incident reboot.
- M currently has 15 service directories.
- recovered healthy shape has no shared top-level supervisor and only five running service targets.
- fixed `21` launcher recovered PocketRisu tunnel + localhost HTTP 200 / ready with shared top-level supervisor absent.
- deployed legacy `20` is regular mode 700 and bound to one exact SHA-256.

IMPLEMENTATION_PR must prove synthetic exact/drift/symlink/missing/idempotence cases plus docs/syntax/diff validation. No device apply in this stage.

## Upstream pitch

This is primarily local PocketRisu/Termux operations hardening. It removes obsolete boot wiring rather than changing PocketRisu application behavior. It is not proposed as an official PocketRisu/PocketRisu upstream PR by default.

## Review / PR state

- current: #3306 IMPLEMENTATION_PR
- next: validation PR only, non-closing
- after merge/postmerge: bounded M retirement + physical reboot proof
