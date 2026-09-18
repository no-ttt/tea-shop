import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

/**
 * D1 只能在請求的執行環境中取得 binding，無法在模組頂層建立單例連線。
 * 每次呼叫都會即時透過 Cloudflare context 取得 `env.DB`。
 * 部署與 `opennextjs-cloudflare dev` 皆可用；純 `next dev` 下不可用（見 CLAUDE.md 的開發模式說明）。
 *
 * 外鍵約束：已實測確認 Cloudflare D1（含本地 wrangler 模擬）預設就開啟
 * `PRAGMA foreign_keys = ON`，跟一般本地 SQLite 檔案預設關閉不同，
 * 不需要每次呼叫都手動執行（D1 沒有持續連線，額外執行只會增加往返成本卻沒有實益）。
 * schema.ts 裡的 ON DELETE/ON UPDATE 宣告已確認會真正生效。
 *
 * 用 async 模式（`{ async: true }`）而非同步模式：同步模式在靜態路由或非靜態路由的頂層呼叫
 * 會直接拋錯（`getCloudflareContext` 官方限制），導致 `app/layout.tsx`／`app/page.tsx` 這類
 * Server Component 無法直接呼叫，過去因此繞路改用 HTTP self-fetch 打自己的 /api/** 路由，
 * 但 Cloudflare 對 Worker 打自己的 *.workers.dev 網址有平台層級限制（Error 1042，防無限迴圈），
 * 沒有自訂網域時會隨機 404。改用 async 模式後不再需要繞路。
 */
export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}
