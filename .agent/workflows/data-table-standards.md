---
description: Standards for implementing and enhancing Data Tables across the system
---

# Data Table Standards

All data tables must follow these UX and architectural standards to ensure consistency and prevent "blank-cell" syndrome.

### 1. Empty States
- Always provide context-specific `emptyTitle` and `emptyDescription` props to the `DataTable`.
- **Registration**: Use "No product drafts" with instructions to add new items.
- **Approval**: Use "Clear for now" or "Queue empty" messages.
- **Masterlist**: Use "No results found" with filter-clearing suggestions.

### 2. Placeholder Logic
- **Never leave a cell blank.**
- Use `CellHelpers.renderMasterText` for Categories, Brands, and Suppliers (defaults to "Unassigned").
- Use `Unnamed Product` as a fallback for missing product names.
- Use `Pending` (italics, muted) for SKU codes that haven't been generated yet.
- Use `Unassigned` for SKU codes that are missing in the masterlist.

### 3. Type Visualization
- Use the `Badge` component for the "Type" column.
- Utilize `CellHelpers.detectInventoryType` to handle legacy data that might be missing the explicit type field.
- **Variant**: Highlight with `border-primary text-primary bg-primary/5`.
- **Regular**: Use `text-muted-foreground opacity-70`.

### 4. Code Organization
- Any common rendering logic (status colors, badges, text formatting) MUST be placed in `@/modules/.../utils/sku-helpers.ts`.
- Components should not define their own `CellHelpers` or `statusVariants` locally.
- Column definitions should remain slim, delegating logic to the central utility.
