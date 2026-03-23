---
description: invoicing-workflow
---

# Invoicing Module Workflow

This workflow documents the logic, flow, and DDLs for the Invoicing module in the Supply Chain Management system.

## Dashboard Overview
- **Metric Cards**:
    - **Customers**: Displays the count of unique customers within the filtered set.
    - **Total Value**: Sum of `total_amount` for all matching sales orders, formatted in PHP.
- **Auto-Categorization**: Orders are grouped by `customer_code` automatically.

## Sales Order List Flow
- **Filter**: `order_status = 'For Invoicing'`
- **Data Source**: Directus API (`items/sales_order`) with joins to `suppliers`, `customer`, `salesman`, `branches`, and `receipt_type`.

### Column Mappings
- **Order Date**: `order_date`
- **Order No.**: `order_no`
- **PO No.**: `po_no`
- **Supplier**: `supplier_id` -> `suppliers.supplier_shortcut`
- **Customer**: `customer_code` -> `customer.customer_name`
- **Total Amount**: `total_amount`
- **Allocated Amount**: `allocated_amount`

## Sales Order Modal Content
### Header
- **Order No**: `order.order_no`
- **Receipt Type**: `order.receipt_type.type`
- **Order Date**: `order.order_date`

### Body (Tabs)
1. **Details**:
    - `Customer Name`, `Customer Code`, `Salesman Name`, `Salesman Code`, `Supplier`, `Branch`.
    - `Remarks`: Editable field that updates `sales_order.remarks`.

## Convert to Invoice Flow (Single Order)
The "Convert to Invoice" feature allows splitting a single Sales Order into multiple Receipts/Invoices based on available picked quantities.

### Header Details
- **Logistics Context**: Displays `dispatch_no`, `consolidator_no`, and `pdp_no` by joining:
    - `sales_order` -> `dispatch_plan_details.dispatch_id` -> `consolidator_dispatches` -> `consolidator`.
- **Order Info**: Mapped from `sales_order` (Order No, Branch, Salesman, Supplier, PO Ref, Order Date).

### Receipt Grid Columns
- **Product**: `product_name` (fetched via join with `products` table).
- **Ordered**: `sales_order_details.ordered_quantity`.
- **Qty**: Editable field for the specific receipt (auto-filled from remaining picked qty).
- **Price**: `sales_order_details.unit_price`.
- **Discount**: Pro-rated `discount_amount`.
- **Total**: Pro-rated `net_amount`.

### Technical Logic
1. **Uniqueness Check**: Before generating or previewing, the system checks `items/sales_invoice.invoice_no` to ensure the receipt number is unique.
2. **Quantity Capping Logic**:
   - `Receipt Qty = Math.min(Input Qty, Ordered Qty, Remaining Pool Qty)`
   - `Remaining Pool Qty = Picked Qty - Applied Qty`
3. **Draft Exclusion**: Items added to the right column (receipt drafts) are hidden from the left column (available items) regardless of quantity.
4. **Zero-Qty Guard**: Items with `pool_remaining = 0` cannot be added to a receipt.

## Receipt Preview & Printing
The system provides a precision-aligned receipt preview optimized for **210mm x 265mm** official paper.

### Layout Details (Coordinate-Based)
- **Header Structure**: Absolute positioning is used for 100% accuracy.
- **Top-Right metadata**: Barcode (Receipt No), Date Today, and Payment Terms Name.
- **Top-Left (Staggered)**: Customer Info block starts below the metadata level.
    - Line 1: `customer_name`
    - Line 2: `customer_name` (staggered right)
    - Line 3: `TIN`
    - Line 4: `province, city, brgy` (staggered right)
- **Table Spacing & Alignment**:
    - **Vertical Space below Header**: Fixed at `pt-8` (~1 inch) for tight coupling.
    - **Row Height**: Increased to `py-[0.24in]` to align perfectly with large physical line gaps.
    - **Column Widths**: Standardized at Name (45%), Qty (10%), Price (15%), Disc. Type (15%), Total (15%).
    - **Right-Side Alignment**: All right-col elements (Barcode, Dates, Amounts) use a consistent `0.3in` offset from the right edge.
- **Paper Size**: Fixed at `210mm x 265mm` with zero margin print styles.

## Data Definition Language (DDL)

### sales_order
```sql
CREATE TABLE `sales_order` (
	`order_id` INT NOT NULL AUTO_INCREMENT,
	`order_no` VARCHAR(255) NOT NULL,
	`customer_code` VARCHAR(50) NOT NULL,
	`order_status` ENUM('For Invoicing', ...) NOT NULL,
	`total_amount` FLOAT(22,5) NULL DEFAULT '0.00000',
    `payment_terms` INT NULL, -- FK to payment_terms
	PRIMARY KEY (`order_id`)
);
```

### sales_invoice
```sql
CREATE TABLE `sales_invoice` (
	`invoice_id` INT NOT NULL AUTO_INCREMENT,
	`order_id` VARCHAR(255) NULL,
	`invoice_no` VARCHAR(255) NULL, -- Must be unique
	`customer_code` VARCHAR(50) NULL,
	`total_amount` DOUBLE NULL,
	`net_amount` DOUBLE NULL,
	PRIMARY KEY (`invoice_id`)
);
```

### customer
```sql
CREATE TABLE `customer` (
	`id` INT NOT NULL AUTO_INCREMENT,
	`customer_code` VARCHAR(50) NOT NULL,
	`customer_name` VARCHAR(255) NOT NULL,
	`customer_tin` VARCHAR(50) NULL,
	`brgy` VARCHAR(255) NULL,
	`city` VARCHAR(255) NULL,
	`province` VARCHAR(255) NULL,
	PRIMARY KEY (`id`),
	UNIQUE INDEX `customer_code` (`customer_code`)
);
```

### payment_terms
```sql
CREATE TABLE `payment_terms` (
	`id` INT NOT NULL AUTO_INCREMENT,
	`payment_name` VARCHAR(255) NOT NULL,
	`payment_days` INT NULL,
	PRIMARY KEY (`id`)
);
```

### products
```sql
CREATE TABLE `products` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `product_id` INT NOT NULL,
    `product_name` VARCHAR(255),
    `unit_of_measurement` INT, -- FK to units.unit_id
    PRIMARY KEY (`id`)
);
```

### units
```sql
CREATE TABLE `units` (
    `unit_id` INT NOT NULL AUTO_INCREMENT,
    `unit_name` VARCHAR(255),
    `unit_shortcut` VARCHAR(50), -- e.g., 'PCS', 'BOX'
    PRIMARY KEY (`unit_id`)
);
```

### discount_type
```sql
CREATE TABLE `discount_type` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `discount_type` VARCHAR(255), -- Name/Description
    PRIMARY KEY (`id`)
);
```
