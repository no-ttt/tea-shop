CREATE TABLE `order_field_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`field_id` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`field_id`) REFERENCES `customer_fields`(`id`) ON UPDATE no action ON DELETE no action
);
