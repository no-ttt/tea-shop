CREATE TABLE `bundle_discount_products` (
	`bundle_id` text NOT NULL,
	`product_id` text NOT NULL,
	PRIMARY KEY(`bundle_id`, `product_id`),
	FOREIGN KEY (`bundle_id`) REFERENCES `bundle_discounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bundle_discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`discount_type` text NOT NULL,
	`discount_value` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customer_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`type` text NOT NULL,
	`required` integer NOT NULL,
	`builtin` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_failure_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`occurred_at` text DEFAULT (datetime('now')) NOT NULL,
	`order_id_attempt` text,
	`error_message` text NOT NULL,
	`error_stack` text,
	`payload_snapshot` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`cart_key` text NOT NULL,
	`name` text NOT NULL,
	`detail` text NOT NULL,
	`price` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`customer_line_id` text,
	`customer_email` text NOT NULL,
	`customer_zip` text,
	`customer_address` text,
	`birthday` text,
	`is_gift` integer DEFAULT false NOT NULL,
	`gift_name` text,
	`shipping_method` text NOT NULL,
	`cvs_type` text,
	`cvs_store_name` text,
	`payment_method` text NOT NULL,
	`bank_transfer_last5` text,
	`line_pay_last3` text,
	`subtotal` integer NOT NULL,
	`bundle_discount_amount` integer DEFAULT 0 NOT NULL,
	`bundle_name` text,
	`shipping_fee` integer NOT NULL,
	`total` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` text NOT NULL,
	`url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`type` text NOT NULL,
	`color` text
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`region_id` text NOT NULL,
	`price_30` integer,
	`price_80` integer,
	`price_150` integer,
	`note` text,
	`status_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`status_id`) REFERENCES `product_statuses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subtitle` text NOT NULL,
	`note` text,
	`bg_pos` text NOT NULL,
	`bg_image` text NOT NULL,
	`bg_image_mobile` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
