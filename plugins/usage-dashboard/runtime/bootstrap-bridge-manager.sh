#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

PRODUCT_MANIFEST_URL='https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/product-manifest.json'
ROOT="$HOME/.local/share/local-usage-dashboard/runtime"
MANAGER="$ROOT/bridge-manager.cjs"
TOKEN_FILE="$HOME/.config/llmgateway-devpass-bridge/token"
SERVICE_NAME='local-usage-runtime-manager'
SERVICE_DIR="$PREFIX/var/service/$SERVICE_NAME"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$ROOT"
curl -fLsS --retry 2 --connect-timeout 15 "$PRODUCT_MANIFEST_URL" -o "$TMP/product-manifest.json"
MANAGER_URL="$(node -e "const m=require(process.argv[1]);process.stdout.write(String(m.components?.bridgeManager?.artifact||''))" "$TMP/product-manifest.json")"
MANAGER_SHA="$(node -e "const m=require(process.argv[1]);process.stdout.write(String(m.components?.bridgeManager?.sha256||''))" "$TMP/product-manifest.json")"
MANAGER_VERSION="$(node -e "const m=require(process.argv[1]);process.stdout.write(String(m.components?.bridgeManager?.version||''))" "$TMP/product-manifest.json")"
case "$MANAGER_URL" in
  https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/*) ;;
  *) echo 'Bridge manager URL 검증 실패'; exit 1 ;;
esac
[[ "$MANAGER_SHA" =~ ^[0-9a-f]{64}$ ]] || { echo 'Bridge manager SHA256 검증 실패'; exit 1; }

curl -fLsS --retry 2 --connect-timeout 15 "$MANAGER_URL" -o "$TMP/bridge-manager.cjs"
node --check "$TMP/bridge-manager.cjs" >/dev/null
ACTUAL_SHA="$(node -e "const fs=require('fs'),c=require('crypto');process.stdout.write(c.createHash('sha256').update(fs.readFileSync(process.argv[1])).digest('hex'))" "$TMP/bridge-manager.cjs")"
[[ "$ACTUAL_SHA" == "$MANAGER_SHA" ]] || { echo 'Bridge manager artifact SHA256 불일치'; exit 1; }
install -m 700 "$TMP/bridge-manager.cjs" "$MANAGER"

mkdir -p "$SERVICE_DIR"
cat > "$SERVICE_DIR/run" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
export LUD_MANAGER_RESTART_MODE=runit
export LUD_BRIDGE_TOKEN_FILE="$TOKEN_FILE"
exec node "$MANAGER"
EOF
chmod 700 "$SERVICE_DIR/run"
rm -f "$SERVICE_DIR/down"

mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/20-local-usage-runtime" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock >/dev/null 2>&1 || true
if [ -f "$PREFIX/etc/profile.d/start-services.sh" ]; then
  . "$PREFIX/etc/profile.d/start-services.sh"
fi
sv up "$SERVICE_DIR" >/dev/null 2>&1 || true
EOF
chmod 700 "$HOME/.termux/boot/20-local-usage-runtime"

if command -v sv-enable >/dev/null 2>&1; then
  sv-enable "$SERVICE_NAME" >/dev/null 2>&1 || true
fi
if command -v sv >/dev/null 2>&1; then
  sv up "$SERVICE_DIR" >/dev/null 2>&1 || true
fi
sleep 1

if [ -s "$TOKEN_FILE" ]; then
  TOKEN="$(cat "$TOKEN_FILE")"
  if curl -fsS --connect-timeout 3 -H "X-DevPass-Bridge-Key: $TOKEN" http://127.0.0.1:39119/status > "$TMP/status.json" 2>/dev/null; then
    node -e "const s=require(process.argv[1]);console.log('Bridge manager 설치 완료 · '+s.protocol+' · v'+s.version+' · self-update '+(s.selfUpdate?'yes':'no'))" "$TMP/status.json"
  else
    echo 'Bridge manager 파일/서비스 설치 완료 · 상태 확인은 아직 대기'
  fi
else
  echo 'Bridge manager 설치 완료 · 기존 Bridge token 파일을 찾지 못해서 상태 인증은 대기'
fi

echo "Manager: $MANAGER_VERSION"
echo '기존 39117 Bridge와 토큰은 변경하지 않았어.'
echo 'Termux:Boot이 설치되어 있고 한 번 실행된 기기에서는 ~/.termux/boot/20-local-usage-runtime 이 termux-services 시작을 이어받아.'
