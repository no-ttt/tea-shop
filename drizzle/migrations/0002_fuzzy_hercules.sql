ALTER TABLE `customer_fields` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `order_field_values_order_id_idx` ON `order_field_values` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_order_id_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `product_images_product_id_idx` ON `product_images` (`product_id`);