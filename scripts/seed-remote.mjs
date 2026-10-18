/**
 * 把 drizzle/seed.sql 灌入遠端（staging／正式環境）D1。
 *
 *   node scripts/seed-remote.mjs staging
 *   node scripts/seed-remote.mjs production
 *
 * seed.sql 是為本地 D1 準備的：`wrangler d1 export` 依表名字母排序輸出 INSERT（不符合外鍵依賴），
 * 再由 wrap-seed-transaction.mjs 包上 BEGIN/COMMIT，讓 PRAGMA defer_foreign_keys 生效。
 * 遠端 D1 兩者都不吃：拒絕 SQL 的 BEGIN TRANSACTION，也不會延後外鍵檢查（逐筆檢查，
 * 第一筆 bundle_discount_products 就因為 products 還沒寫入而失敗，整批回滾）。
 * 所以這裡拿掉 PRAGMA/BEGIN/COMMIT，依外鍵依賴順序重排 INSERT，寫成暫存檔後交給 wrangler 執行。
 * seed.sql 本身不動，本地的 db:seed:local／db:reset:local 照舊。
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TARGETS = {
  staging: { db: "qiwish-db-staging", envArgs: ["--env", "staging"] },
  production: { db: "qiwish-db", envArgs: ["--env="] },
};

// 父表在前：products 依賴 regions/product_statuses；product_images、bundle_discount_products 依賴 products；
// bundle_discount_products 依賴 bundle_discounts。seed 出現這裡沒列的表會直接中止，避免排序錯誤。
const TABLE_ORDER = [
  "regions",
  "product_statuses",
  "products",
  "product_images",
  "bundle_discounts",
  "bundle_discount_products",
  "customer_fields",
  "site_settings",
];

const targetName = process.argv[2];
const target = TARGETS[targetName];
if (!target) {
  console.error("用法：node scripts/seed-remote.mjs <staging|production>");
  process.exit(1);
}

const lines = readFileSync(new URL("../drizzle/seed.sql", import.meta.url), "utf8")
  .split("\n")
  .map((line) => line.replace(/COMMIT;$/, "").trim())
  .filter((line) => line && line !== "PRAGMA defer_foreign_keys=TRUE;" && line !== "BEGIN TRANSACTION;");

const byTable = new Map(TABLE_ORDER.map((table) => [table, []]));
for (const line of lines) {
  const match = line.match(/^INSERT INTO "([a-z_]+)"/);
  if (!match) throw new Error(`seed-remote: 無法辨識的 seed.sql 內容：${line.slice(0, 80)}`);
  const bucket = byTable.get(match[1]);
  if (!bucket) throw new Error(`seed-remote: 資料表 ${match[1]} 不在 TABLE_ORDER 裡，請先補上它的外鍵順序`);
  bucket.push(line);
}

const dir = mkdtempSync(join(tmpdir(), "qiwish-seed-"));
const file = join(dir, "seed.remote.sql");
writeFileSync(file, TABLE_ORDER.flatMap((table) => byTable.get(table)).join("\n") + "\n");

try {
  execFileSync("npx", ["wrangler", "d1", "execute", target.db, "--remote", ...target.envArgs, `--file=${file}`], {
    stdio: "inherit",
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
