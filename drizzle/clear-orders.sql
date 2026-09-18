-- 清空所有訂單相關資料（orders/order_items/order_field_values/order_failure_logs）。
-- 不影響商品/分區/狀態/客戶欄位/組合折扣/系統設定等目錄型資料（那些用 reset-local.sql 處理）。
PRAGMA defer_foreign_keys=TRUE;
DELETE FROM "order_field_values";
DELETE FROM "order_items";
DELETE FROM "order_failure_logs";
DELETE FROM "orders";
