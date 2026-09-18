#!/usr/bin/env bash
# 把 .dev.vars 裡的值設定成正式環境（Cloudflare）的 secrets。
#
# 用途：第一次上線，或之後要更換任何一組密鑰時（例如換 Resend API key、改後台密碼、
# 換寄件地址），先編輯 .dev.vars 裡的值，再重跑這支腳本即可覆蓋正式環境的舊值。
#
# 前提：
#   1. .dev.vars 存在且已填入你要用在正式環境的實際值（cp .env.example .dev.vars 後編輯）
#   2. 已用 `npx wrangler login` 登入正確的 Cloudflare 帳號
#
# 重要：wrangler.jsonc 刻意不把這四個變數宣告成 "vars"（原因見 wrangler.jsonc 內的註解——
# vars 空字串會在每次 `wrangler deploy` 時覆蓋掉已設定的 secrets）。這支腳本只透過
# `wrangler secret put` 設定，不會被 deploy 動到。
#
# 用法：
#   npm run secrets:set

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .dev.vars ]; then
  echo "錯誤：找不到 .dev.vars，先執行 cp .env.example .dev.vars 並填入實際值再重跑。" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .dev.vars
set +a

REQUIRED_VARS=(RESEND_API_KEY EMAIL_FROM ADMIN_PASSWORD SESSION_SECRET)
for name in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!name:-}" ]; then
    echo "錯誤：.dev.vars 裡的 $name 是空的，請先填值。" >&2
    exit 1
  fi
done

echo "即將把以下 secrets 寫入正式環境（值不會顯示在這裡）："
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
  printf '%s' "${!name}" | npx wrangler secret put "$name"
done

echo ""
echo "完成。用以下指令確認四個 secrets 都存在（不會顯示實際值）："
echo "  npx wrangler secret list"
