# Phase 1 - Entity Relationship Model

Template: Mega Marketplace
Database: MySQL

## Core ER Diagram

```mermaid
erDiagram
    USERS ||--o{ VENDORS : owns
    VENDORS ||--o{ PRODUCTS : lists
    USERS ||--o{ ORDERS : places
    ORDERS ||--o{ ORDER_ITEMS : contains
    VENDORS ||--o{ ORDER_ITEMS : fulfills
    PRODUCTS ||--o{ ORDER_ITEMS : sold_as
    VENDORS ||--o{ VENDOR_LEDGER : earns
    ORDERS ||--o{ VENDOR_LEDGER : creates
    ORDER_ITEMS ||--o| VENDOR_LEDGER : can_reference

    USERS {
        bigint id PK
        char uuid UK
        varchar name
        varchar email UK
        varchar password
        enum status
        enum default_role
        timestamp email_verified_at
        timestamp created_at
        timestamp updated_at
    }

    VENDORS {
        bigint id PK
        char uuid UK
        bigint owner_user_id FK
        varchar display_name
        varchar slug UK
        enum status
        decimal commission_rate
        timestamp created_at
        timestamp updated_at
    }

    PRODUCTS {
        bigint id PK
        char uuid UK
        bigint vendor_id FK
        varchar sku
        varchar name
        enum status
        decimal price
        int stock_quantity
        timestamp created_at
        timestamp updated_at
    }

    ORDERS {
        bigint id PK
        char uuid UK
        bigint user_id FK
        varchar order_number UK
        enum status
        enum payment_status
        decimal subtotal
        decimal tax_total
        decimal shipping_total
        decimal grand_total
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEMS {
        bigint id PK
        bigint order_id FK
        bigint vendor_id FK
        bigint product_id FK
        varchar product_name
        int quantity
        decimal unit_price
        decimal line_total
        enum fulfillment_status
        timestamp created_at
        timestamp updated_at
    }

    VENDOR_LEDGER {
        bigint id PK
        char uuid UK
        bigint vendor_id FK
        bigint order_id FK
        bigint order_item_id FK
        enum entry_type
        enum status
        decimal gross_amount
        decimal commission_amount
        decimal net_amount
        timestamp created_at
    }
```

## Relationship Rules

- One user can own zero or many vendors.
- One vendor owns many products.
- One customer user places many orders.
- One order contains many order items.
- Every order item belongs to exactly one vendor.
- One checkout can produce one parent order with multiple vendor-specific order items.
- Vendor ledger entries are generated from orders and/or order items.
- Ledger entries are append-only. Do not update financial history; add reversal entries when needed.

## Normalization Decisions

- Product name, SKU, and unit price are copied into `order_items` at purchase time.
  This preserves historical order accuracy if the product changes later.
- `vendor_ledger` stores gross, commission, and net amounts per vendor.
  This avoids recalculating historical payouts from mutable product/order data.
- `orders` is customer-facing. Vendor fulfillment is tracked at `order_items`.
  In Phase 3 we can optionally add `vendor_orders` if we need separate vendor order numbers.

## Important Future Tables

These are intentionally not part of the Phase 1 minimum schema, but should be added later:

- carts
- cart_items
- product_images
- product_categories
- product_variants
- vendor_payouts
- addresses
- payments
- refunds
- reviews
- audit_logs
- roles / permissions if we outgrow simple role fields
