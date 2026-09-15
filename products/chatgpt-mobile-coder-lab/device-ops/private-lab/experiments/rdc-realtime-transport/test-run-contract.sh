#!/bin/sh
set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
RUN=$DIR/run.sh
PROBE=$DIR/probe.mjs
pass=0

ok() {
  pass=$((pass + 1))
  printf 'ok %s - %s\n' "$pass" "$1"
}

sh -n "$RUN"
node --check "$PROBE"
ok 'shell and probe syntax are valid'

grep -Fq 'PD=/data/data/com.termux/files/usr/bin/proot-distro' "$RUN"
grep -Fq 'login --isolated "$LAB_NAME"' "$RUN"
grep -Fq '/usr/bin/node --input-type=module -' "$RUN"
ok 'runner uses only the fixed isolated PRIVATE LAB entrypoint'

grep -Fq '[ "$#" -eq 0 ]' "$RUN"
! grep -Fq 'TEST_MODE' "$RUN"
! grep -Fq 'TEST_ROOT' "$RUN"
ok 'runner exposes no argument or test-root passthrough'
! grep -Eq "from 'node:(http|https|net|tls|dns)'|fetch\(" "$PROBE"
! grep -Eq 'curl|wget|npm |npx |pnpm|yarn' "$RUN" "$PROBE"
ok 'production path contains no network or package-manager primitive'

! grep -Eq 'writeFile|appendFile|rename|unlink|rmSync|mkdir|rmdir' "$PROBE"
! grep -Eq 'vendor/.+>|>.+vendor|rm -.+vendor|mv -.+vendor|cp -.+vendor' "$RUN"
ok 'production path has no vendor write primitive'

grep -Fq "'schema=mcl-private-check.v1'" "$PROBE"
grep -Fq "'check=rdc-realtime-transport-observer'" "$PROBE"
grep -Fq "'details=withheld'" "$PROBE"
grep -Fq "new Set(['pass', 'fail', 'blocked', 'unknown'])" "$PROBE"
ok 'outward receipt vocabulary is fixed and bounded'

for value in 0.2.50 2.116.0 0.4.5 8.21.3; do
  grep -Fq "'$value'" "$PROBE"
done
ok 'all four public dependency identities are pinned'

printf '1..%s\n' "$pass"
