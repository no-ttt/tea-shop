#!/usr/bin/env bash
# 把本機 vars 檔裡的值設定成 Cloudflare 上指定環境的 secrets。
#
#   npm run secrets:set:production   # 讀 .dev.vars          → 正式環境（qiwish-nextjs）
#   npm run secrets:set:staging      # 讀 .dev.vars.staging  → staging（qiwish-nextjs-staging）
#
# 用途：第一次上線，或之後要更換任何一組密鑰時（例如換 Resend API key、改後台密碼、
# 換寄件地址），先編輯對應 vars 檔裡的值，再重跑這支腳本即可覆蓋該環境的舊值。
#
# 前提：
#   1. vars 檔存在且已填入要用在該環境的實際值（cp .env.example .dev.vars[.staging] 後編輯）
#   2. 已用 `npx wrangler login` 登入正確的 Cloudflare 帳號
#
# 重要：wrangler.jsonc 刻意不把這些變數宣告成 "vars"（原因見 wrangler.jsonc 內的註解——
# vars 空字串會在每次 `wrangler deploy` 時覆蓋掉已設定的 secrets）。這支腳本只透過
# `wrangler secret put` 設定，不會被 deploy 動到。

set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-}"
case "$TARGET" in
  production)
    VARS_FILE=.dev.vars
    ENV_ARGS=(--env "")   # 明確指定上層（正式）環境，wrangler 才不會跳多環境警告
    REQUIRED_VARS=(RESEND_API_KEY EMAIL_FROM ADMIN_PASSWORD SESSION_SECRET)
    ;;
  staging)
    VARS_FILE=.dev.vars.staging
    ENV_ARGS=(--env staging)
    # staging 一定要設 EMAIL_TEST_REDIRECT_TO，測試訂單的信才不會寄到業主或真實客人
    REQUIRED_VARS=(RESEND_API_KEY EMAIL_FROM ADMIN_PASSWORD SESSION_SECRET EMAIL_TEST_REDIRECT_TO)
    ;;
  *)
    echo "用法：bash scripts/set-secrets.sh <staging|production>" >&2
    exit 1
    ;;
esac

if [ ! -f "$VARS_FILE" ]; then
  echo "錯誤：找不到 $VARS_FILE，先執行 cp .env.example $VARS_FILE 並填入實際值再重跑。" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$VARS_FILE"
set +a

for name in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!name:-}" ]; then
    echo "錯誤：$VARS_FILE 裡的 $name 是空的，請先填值。" >&2
    exit 1
  fi
done

echo "即將把 $VARS_FILE 的以下 secrets 寫入【$TARGET】環境（值不會顯示在這裡）："
for name in "${REQUIRED_VARS[@]}"; do
  echo "  - $name"
done
echo ""
read -r -p "確認要繼續嗎？(y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "已取消。"
  exit 0
fi

for name in "${REQUIRED_VARS[@]}"; do
  echo "設定 $name ..."
  printf '%s' "${!name}" | npx wrangler secret put "$name" ${ENV_ARGS[@]+"${ENV_ARGS[@]}"}
done

echo ""
echo "完成。用以下指令確認 secrets 都存在（不會顯示實際值）："
echo "  npx wrangler secret list ${ENV_ARGS[*]:-}"
