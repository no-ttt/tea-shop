/**
 * `wrangler d1 export` 產生的 seed.sql 不保證 INSERT 順序符合外鍵依賴，
 * 開頭的 PRAGMA defer_foreign_keys=TRUE 只在明確交易內才有效。
 * 這個腳本在 `npm run db:seed:dump` 之後自動補上 BEGIN/COMMIT 包裹，
 * 避免每次重新匯出都要手動加回去。
 */
import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../drizzle/seed.sql", import.meta.url);
const content = readFileSync(path, "utf8");

if (content.includes("BEGIN TRANSACTION;")) {
  console.log("seed.sql already wrapped in a transaction, skipping.");
  process.exit(0);
}

const PRAGMA_LINE = "PRAGMA defer_foreign_keys=TRUE;\n";
if (!content.startsWith(PRAGMA_LINE)) {
  // 沒抓到就中止，避免只補上 COMMIT 卻漏了 BEGIN（比完全沒修過還糟：無交易可提交，套用時會直接失敗）。
  throw new Error(
    `wrap-seed-transaction: seed.sql did not start with the expected PRAGMA line ` +
      `("${PRAGMA_LINE.trim()}"). The wrangler d1 export format may have changed — ` +
      `update this script's expected prefix before re-running.`,
  );
}

const wrapped = PRAGMA_LINE + "BEGIN TRANSACTION;\n" + content.slice(PRAGMA_LINE.length) + "COMMIT;\n";

writeFileSync(path, wrapped);
console.log("Wrapped drizzle/seed.sql in BEGIN TRANSACTION / COMMIT.");
