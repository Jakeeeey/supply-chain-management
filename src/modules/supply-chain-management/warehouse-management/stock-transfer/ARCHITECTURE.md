# Stock Transfer Module Architecture & Structure

This module follows a service-oriented architecture designed for scalability and developer clarity.

## 📂 Directory Structure

```
stock-transfer/
├── components/          # Reusable UI components
│   └── shared/          # Components used across all sub-modules (Table, Modals, Print, etc.)
├── hooks/               # Domain-specific React hooks
│   ├── use-stock-transfer-base.ts       # Shared state and fetching logic
│   ├── use-stock-transfer-request.ts    # Request phase
│   ├── use-stock-transfer-approval.ts   # Approval phase
│   ├── use-stock-transfer-dispatch.ts   # Dispatching (RFID-based)
│   ├── use-stock-transfer-dispatch-manual.ts # Dispatching (Manual Quantity)
│   ├── use-stock-transfer-receive.ts    # Receiving (RFID-based)
│   └── use-stock-transfer-receive-manual.ts # Receiving (Manual Quantity)
├── services/            # Business logic and Core API
│   ├── api.ts                   # Fetch wrapper
│   ├── stock-transfer.repo.ts   # Data access layer (Directus/Spring)
│   ├── stock-transfer.lifecycle.ts # Hook-facing consolidated methods
│   └── stock-transfer.helpers.ts # Formatting and pure helpers
├── types/               # TypeScript definitions
│   └── stock-transfer.types.ts  # Unified interfaces
└── views/               # Main feature entry points
    ├── StockTransferRequestView.tsx
    ├── StockTransferApprovalView.tsx
    ├── StockTransferDispatchView.tsx
    ├── StockTransferDispatchManualView.tsx
    ├── StockTransferReceiveView.tsx
    └── StockTransferReceiveManualView.tsx
```

## 🛠️ Convention Rules

1. **File Naming**: 
   - Components & Views: `PascalCase.tsx` (e.g., `StockTransferTable.tsx`)
   - Hooks & Services: `kebab-case.ts` (e.g., `use-stock-transfer-base.ts`)
2. **State Management**: Specialized phase hooks (Approval, Dispatch, etc.) must extend `use-stock-transfer-base.ts` to maintain state consistency.
3. **Data Access Layer**: Components ➔ Hooks ➔ Lifecycle ➔ Services ➔ Repository ➔ API.
4. **Shared Components**: All sub-modules (Request, Dispatch, etc.) should use components from `components/shared/` to ensure a unified UI experience.
5. **Types**: Always import from the central `types/stock-transfer.types.ts`. Avoid defining local types within component files.

## 🚀 Key Features
- **Centralized Base State**: Real-time synchronization of branching and transfer data across views.
- **RFID & Manual Support**: Native support for RFID scanning with a dedicated manual fallback for both dispatching and receiving.
- **Dynamic PDF Generation**: High-density picklists and received receipts via `generate-stock-transfer-pdf.ts`.
