-- 只清空 seed.sql 涵蓋的目錄型資料表，訂單相關表（orders/order_items/
-- order_field_values/order_failure_logs）刻意不動，避免重置測試資料時
-- 意外連真實/測試訂單紀錄一起清掉。
PRAGMA defer_foreign_keys=TRUE;
DELETE FROM "bundle_discount_products";
DELETE FROM "bundle_discounts";
DELETE FROM "customer_fields";
DELETE FROM "product_images";
DELETE FROM "products";
DELETE FROM "product_statuses";
DELETE FROM "regions";
DELETE FROM "site_settings";
