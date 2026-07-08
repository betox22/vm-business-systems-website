-- Mega Marketplace - Phase 1 MySQL schema
-- Target: MySQL 8.x, InnoDB, utf8mb4
-- Scope: Users, Vendors, Products, Orders, Order_Items, Vendor_Ledger

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(40) NULL,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    default_role ENUM('admin', 'vendor', 'customer', 'support') NOT NULL DEFAULT 'customer',
    status ENUM('active', 'pending', 'suspended', 'deleted') NOT NULL DEFAULT 'pending',
    remember_token VARCHAR(100) NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY users_uuid_unique (uuid),
    UNIQUE KEY users_email_unique (email),
    KEY users_status_index (status),
    KEY users_default_role_index (default_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendors (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    owner_user_id BIGINT UNSIGNED NOT NULL,
    display_name VARCHAR(180) NOT NULL,
    legal_name VARCHAR(220) NULL,
    slug VARCHAR(190) NOT NULL,
    support_email VARCHAR(190) NULL,
    support_phone VARCHAR(40) NULL,
    status ENUM('draft', 'pending_review', 'active', 'paused', 'suspended', 'rejected') NOT NULL DEFAULT 'draft',
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    payout_status ENUM('not_configured', 'pending_verification', 'ready', 'paused') NOT NULL DEFAULT 'not_configured',
    metadata JSON NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY vendors_uuid_unique (uuid),
    UNIQUE KEY vendors_slug_unique (slug),
    KEY vendors_owner_user_id_index (owner_user_id),
    KEY vendors_status_index (status),
    CONSTRAINT vendors_owner_user_id_foreign
        FOREIGN KEY (owner_user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT vendors_commission_rate_check
        CHECK (commission_rate >= 0.00 AND commission_rate <= 80.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    vendor_id BIGINT UNSIGNED NOT NULL,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(220) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    short_description VARCHAR(500) NULL,
    description TEXT NULL,
    category_name VARCHAR(160) NULL,
    status ENUM('draft', 'pending_review', 'active', 'inactive', 'rejected', 'archived') NOT NULL DEFAULT 'draft',
    price DECIMAL(12,2) NOT NULL,
    compare_at_price DECIMAL(12,2) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    inventory_policy ENUM('deny', 'continue') NOT NULL DEFAULT 'deny',
    featured TINYINT(1) NOT NULL DEFAULT 0,
    rating_average DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    rating_count INT UNSIGNED NOT NULL DEFAULT 0,
    primary_image_url VARCHAR(1000) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY products_uuid_unique (uuid),
    UNIQUE KEY products_vendor_sku_unique (vendor_id, sku),
    UNIQUE KEY products_vendor_slug_unique (vendor_id, slug),
    KEY products_vendor_status_index (vendor_id, status),
    KEY products_category_index (category_name),
    KEY products_featured_index (featured),
    KEY products_price_index (price),
    CONSTRAINT products_vendor_id_foreign
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT products_price_check
        CHECK (price >= 0.00),
    CONSTRAINT products_compare_at_price_check
        CHECK (compare_at_price IS NULL OR compare_at_price >= 0.00),
    CONSTRAINT products_rating_average_check
        CHECK (rating_average >= 0.00 AND rating_average <= 5.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    order_number VARCHAR(40) NOT NULL,
    status ENUM('draft', 'placed', 'processing', 'partially_fulfilled', 'fulfilled', 'cancelled', 'refunded') NOT NULL DEFAULT 'draft',
    payment_status ENUM('unpaid', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed') NOT NULL DEFAULT 'unpaid',
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    shipping_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_provider VARCHAR(80) NULL,
    payment_reference VARCHAR(190) NULL,
    idempotency_key VARCHAR(190) NULL,
    placed_at TIMESTAMP NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY orders_uuid_unique (uuid),
    UNIQUE KEY orders_order_number_unique (order_number),
    UNIQUE KEY orders_idempotency_key_unique (idempotency_key),
    KEY orders_user_id_index (user_id),
    KEY orders_status_index (status),
    KEY orders_payment_status_index (payment_status),
    KEY orders_created_at_index (created_at),
    CONSTRAINT orders_user_id_foreign
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT orders_totals_check
        CHECK (
            subtotal >= 0.00
            AND discount_total >= 0.00
            AND tax_total >= 0.00
            AND shipping_total >= 0.00
            AND grand_total >= 0.00
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    vendor_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NULL,
    product_uuid CHAR(36) NULL,
    product_sku VARCHAR(100) NULL,
    product_name VARCHAR(220) NOT NULL,
    vendor_display_name VARCHAR(180) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    shipping_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    fulfillment_status ENUM('pending', 'accepted', 'packed', 'shipped', 'delivered', 'cancelled', 'returned') NOT NULL DEFAULT 'pending',
    metadata JSON NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY order_items_order_id_index (order_id),
    KEY order_items_vendor_id_index (vendor_id),
    KEY order_items_product_id_index (product_id),
    KEY order_items_fulfillment_status_index (fulfillment_status),
    CONSTRAINT order_items_order_id_foreign
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT order_items_vendor_id_foreign
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT order_items_product_id_foreign
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT order_items_quantity_check
        CHECK (quantity > 0),
    CONSTRAINT order_items_money_check
        CHECK (
            unit_price >= 0.00
            AND discount_total >= 0.00
            AND tax_total >= 0.00
            AND shipping_total >= 0.00
            AND line_total >= 0.00
        ),
    CONSTRAINT order_items_commission_rate_check
        CHECK (commission_rate >= 0.00 AND commission_rate <= 80.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendor_ledger (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    vendor_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    order_item_id BIGINT UNSIGNED NULL,
    entry_type ENUM('sale', 'commission', 'refund', 'adjustment', 'payout', 'reversal') NOT NULL,
    status ENUM('pending', 'available', 'paid', 'held', 'reversed') NOT NULL DEFAULT 'pending',
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    available_at TIMESTAMP NULL,
    paid_at TIMESTAMP NULL,
    external_payout_reference VARCHAR(190) NULL,
    notes VARCHAR(500) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY vendor_ledger_uuid_unique (uuid),
    KEY vendor_ledger_vendor_status_index (vendor_id, status),
    KEY vendor_ledger_order_id_index (order_id),
    KEY vendor_ledger_order_item_id_index (order_item_id),
    KEY vendor_ledger_entry_type_index (entry_type),
    KEY vendor_ledger_available_at_index (available_at),
    CONSTRAINT vendor_ledger_vendor_id_foreign
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT vendor_ledger_order_id_foreign
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT vendor_ledger_order_item_id_foreign
        FOREIGN KEY (order_item_id) REFERENCES order_items(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT vendor_ledger_commission_rate_check
        CHECK (commission_rate >= 0.00 AND commission_rate <= 80.00),
    CONSTRAINT vendor_ledger_amounts_check
        CHECK (
            gross_amount >= 0.00
            AND commission_amount >= 0.00
            AND net_amount >= 0.00
        )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
