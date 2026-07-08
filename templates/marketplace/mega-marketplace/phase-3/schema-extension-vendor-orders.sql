-- Mega Marketplace - Phase 3 schema extension
-- Adds vendor-specific order splits for operational marketplace workflows.

CREATE TABLE IF NOT EXISTS vendor_orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    vendor_id BIGINT UNSIGNED NOT NULL,
    vendor_order_number VARCHAR(50) NOT NULL,
    status ENUM('pending', 'accepted', 'packed', 'shipped', 'delivered', 'cancelled', 'returned') NOT NULL DEFAULT 'pending',
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    shipping_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    vendor_net_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    accepted_at TIMESTAMP NULL,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY vendor_orders_uuid_unique (uuid),
    UNIQUE KEY vendor_orders_number_unique (vendor_order_number),
    UNIQUE KEY vendor_orders_order_vendor_unique (order_id, vendor_id),
    KEY vendor_orders_vendor_status_index (vendor_id, status),
    KEY vendor_orders_order_id_index (order_id),
    CONSTRAINT vendor_orders_order_id_foreign
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT vendor_orders_vendor_id_foreign
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT vendor_orders_totals_check
        CHECK (
            subtotal >= 0.00
            AND discount_total >= 0.00
            AND tax_total >= 0.00
            AND shipping_total >= 0.00
            AND grand_total >= 0.00
            AND commission_amount >= 0.00
            AND vendor_net_amount >= 0.00
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE order_items
    ADD COLUMN vendor_order_id BIGINT UNSIGNED NULL AFTER order_id,
    ADD KEY order_items_vendor_order_id_index (vendor_order_id),
    ADD CONSTRAINT order_items_vendor_order_id_foreign
        FOREIGN KEY (vendor_order_id) REFERENCES vendor_orders(id)
        ON DELETE RESTRICT ON UPDATE CASCADE;
