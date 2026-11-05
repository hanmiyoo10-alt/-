# 메인폰 notification transport durability

Feature-ID: `notification-transport-durability`
상태: **LIVE_PROVEN / DONE**

## 목적

메인폰의 PocketRisu 알림 transport가 shared Termux `runsvdir` 없이 동작하는 현재 구조를 유지하면서, relay 전용 `runsv`와 notify reverse-tunnel 전용 `runsv`가 선택적으로 사라져도 다시 복구 가능하게 만든다.

이 Feature-ID는 #3711 / #3709의 자연 재발을 durability repair로 종결한 #3712의 구현/배포 owner다. 서버폰 PocketRisu v1.15.2 코드나 #3269 알림 sound/channel 문제를 소유하지 않는다.

## 확정된 장애 경계

2026-10-22 자연 운용에서 다음을 확인했다.

- `pocketrisu-notify-relay` 전용 runsv + receiver가 반복 소실됨.
- `pocketrisu-notify-tunnel` 전용 runsv + reverse SSH가 반복 소실됨.
- shared top-level `runsvdir`는 계속 없음.
- core SSH path도 손실이 발생하지만 기존 guard↔anchor ring이 guard와 dedicated runsv를 다시 만든 semantic log가 남음.
- 따라서 standalone service-specific supervisor survival gap은 확정이다.
- 현재 recurrence의 직접 Android kill 원인은 `UNKNOWN / CONSISTENT_WITH #3231`이다.

## 소유 경계

이 기능은 **notification transport durability ring만** 소유한다.

- relay target semantics는 #3513의 exact installed launcher에 위임한다.
- notify-tunnel은 기존 fixed service/run bytes를 수정하지 않는다.
- private SSH destination/username/address를 repository에 넣지 않는다.
- core SSH guard/anchor, RDC, Tailscale, MCL lifeline을 수정하지 않는다.
- Android phantom-process policy를 수정하지 않는다.
- shared `runsvdir` / `service-daemon`을 만들거나 재시작하지 않는다.

## 구현

### guard

`files/pocketrisu-notification-transport-guard`

고정된 M Termux path만 사용한다.

relay:
- exact `~/.termux/boot/22-pocketrisu-notify-relay-supervisor` regular executable;
- expected SHA-256 `f1015e8dea71226bad9f3de2dda0a2102fa2a6027012ffd15ed45fdb3e227e35`;
- exact launcher `--ensure`에만 위임한다.
- receiver identity/orphan/down/health semantics를 이 guard에서 복제하지 않는다.

notify-tunnel:
- exact service `$PREFIX/var/service/pocketrisu-notify-tunnel`;
- exact regular mode-0700 run file;
- expected run SHA-256 `91351ceddc958c609673ac28ff99a23dfd5a7b9bfc2b21ca7b35f07170ad46f3`;
- fixed reverse-forward semantic `-R 127.0.0.1:39120:127.0.0.1:39120`만 인식한다.
- run/down supervision은 보존한다.
- missing supervisor + reverse SSH 0개만 start eligible이다.
- missing supervisor + exact PID-1 reverse SSH 1개는 orphan으로 보존한다.
- multiple/alternate/non-PID1 ownership은 fail closed 한다.

guard loop는 anchor 존재만 다시 보장하며 target health를 restart trigger로 쓰지 않는다.

### independent anchor

`files/23-pocketrisu-notification-transport-guard`

- Termux:Boot entry + independent fixed anchor owner.
- guard loop이 exact/alive이면 보존.
- guard가 missing이면 guard loop 하나만 다시 시작.
- zombie guard/anchor PID는 `/proc/$pid/stat`의 `Z`를 stale/dead로 판정한다.
- live non-owner PID identity는 ambiguous로 fail closed 한다.
- anchor는 relay/notify target을 직접 만지지 않는다.
- 살아 있는 guard는 `--ensure-anchor`로 anchor hard-loss를 복구한다.

이 구조는 simultaneous guard+anchor loss, whole-Termux process loss, Android package force-stop을 해결한다고 주장하지 않는다.

## 검증

Repository / merge:
- primary PR #3713 repaired head `0b50688000d0fd6ffd7d1b855c6854e2dfb3ddcf`에서 zombie guard/anchor PID를 stale/dead로 처리하는 P1 fix와 explicit zombie regressions를 포함했다.
- primary merge는 `5231ad79c77f61622eb04b92665232089f5968b0`.
- merged-main focused-test operator-down ordering race는 production payload 변경 없이 test/docs-only PR #3714로 repair했다.
- final protected main은 `e559dc09b3c030f31defc74aec6f1d19e7855a2f`.
- final PocketRisu helper docs / SimCore Verify+Required / Canonical Main Proof Bundle: PASS.
- #485: final main exact / CLEAR / STABLE / UNKNOWN NONE.
- final pre-feature→main scope는 exact 7 paths이고 final diff SHA-256은 `883c94c3e704ac7aee756fd4117c733e8faba96b4a2b98673c716df843e95ec1`.

Physical-M LIVE_PROVEN:
- exact merged guard SHA-256 `3d7c56777c252304c14ca280b63a555bcf370d425887013e39dbd10979f9166c`, mode 0700.
- exact merged Boot/anchor SHA-256 `7d82f94bfca9d1f1da721f5e17144ccc1ad02bb690b3f4d13ebcff5be92514ec`, mode 0700.
- controlled guard hard loss → anchor가 exact new guard 복구: PASS.
- controlled anchor hard loss → guard가 exact new anchor 복구: PASS.
- controlled relay runsv loss → healthy exact PID1 orphan receiver 1개 보존 / duplicate 0: PASS.
- controlled notify runsv loss → healthy exact PID1 orphan reverse SSH 1개 보존 / duplicate 0: PASS.
- guard interval을 넘긴 soak에서도 단일 orphan 상태와 duplicate 0 유지: PASS.
- shared top-level `runsvdir`: absent.
- neighboring RDC / Tailscale / core health: preserved.
- 실제 S→M notification POST: HTTP 200, M Android durability smoke 표시 PASS.

Canonical closure:
- POSTMERGE_CONVERGENCE receipt/checkpoint: `2e4927f5f8345d43196ae57e26502ff5f0969950141af0553fbc764db12b1075 / 4d269c3270a6aac5b18e22a59b5ae2d6e0c18a3eaa7b64763b8a7a8efc7188e6`.
- EXPERIMENT_CLOSE receipt/checkpoint: `b984851ee29d5466cd4b999bd403ea534137a3625606b02246d936e75f6835f7 / 8cf6d574e9e81320642fbb46dacb302c02b78a4e31966ee55abbebc4d2b73d11`.
- proof terms: `IMPLEMENTED / CONTRACT_PROVEN / LIVE_PROVEN / DONE`.

## 배포 / rollback

배포 완료:
- live install 전 target guard/Boot 상태는 둘 다 ABSENT였다.
- exact merged guard를 `~/.local/bin/pocketrisu-notification-transport-guard` mode 0700으로 설치했다.
- exact merged Boot/anchor를 `~/.termux/boot/23-pocketrisu-notification-transport-guard` mode 0700으로 설치했다.
- 기존 relay launcher, receiver/run, notify-tunnel run, core owner bytes는 수정하지 않았다.
- Android phantom-process global policy도 변경하지 않았다.

Rollback boundary:
- 이 Feature-ID의 rollback은 새 guard + Boot/anchor 두 파일만 제거하는 범위다.
- 기존 relay/tunnel/core owner를 kill/restart하거나 shared `runsvdir`를 복원하는 rollback은 금지한다.
- 현재 live proof가 완료됐으므로 rollback은 새 증거가 있는 실제 회귀에서만 별도 admission 후 수행한다.

## 다음 한 단계

이 Feature-ID는 DONE이다. repository merge/postmerge와 controlled-loss live proof를 재실행하지 않는다.

자연 운용만 관찰하며 별도 owner로 분리한다.
- #3715: core exact PID1 four-forward orphan + runit/guard-anchor reconciliation.
- #3231: Android phantom-process initiating cause / process-policy.
- #3269: 전화/이어폰 notification sound/channel.
- #2027: Firefox foreground-return reconstruction / inactive-preset UI persistence.
