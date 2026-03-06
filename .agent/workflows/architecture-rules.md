---
description: Architectural standards for building and refactoring any module in the management system.
---

# 🏛️ Architecture Rules & Standards

All system components must follow this domain-driven architecture to maintain consistency and developer experience.

## 1. Directory Structure

Every module must reside in `src/modules/[subsystem]/[module-name]/` and maintain this hierarchy for simple modules:

```text
├── api/                # Module-specific API handlers
├── components/          # UI Components (DataTable, Forms, Modals)
├── hooks/               # Custom React hooks (Data fetching & state)
├── services/            # Pure TypeScript business logic
├── providers/           # Context providers for shared state
├── types/ or types.ts   # Zod schemas and TypeScript interfaces
└── [Module]Page.tsx     # Main entry point for the module
```

### 1.1 Granular Sub-Module Architecture

For complex modules with distinct lifecycle states (e.g., Draft → Approval → Masterlist), use a granular sub-module structure. Each feature area resides in its own sub-directory with internal layers:

```text
/module/sub-module-name/
├── components/          # UI Components (DataTable, Forms, Modals)
│   ├── data-table/      # (columns, index (DataTable), data-table-header)
│   ├── modals/          # (modals)
│   └── forms/           # (forms)
├── hooks/               # Custom React hooks (Data fetching & state)
├── services/            # Pure TypeScript business logic
├── providers/           # Context providers for shared state (only use if necessary ex: date filtering that use of all sub-module inside the parent module)
├── utils/               # Helpers
├── types/ or types.ts   # Zod schemas and TypeScript interfaces
└── [Module]Page.tsx     # Main entry point for the module
```

**Example (Bundling Module):**

- `/bundling/bundle-creation/`
- `/bundling/bundle-approval/`
- `/bundling/bundle-masterlist/`

## 2. The Data Flow Protocol

- **One-Way Flow**: View (Component) -> State (Hook) -> Backend (API) -> Domain Logic (Service).
- **Single Source of Truth**: Fetch data once at the hook level; pass necessary slices to nested components via props or Context.

## 3. Implementation Rules

- **Explicit Returns**: Always define return types for Service and API functions.
- **Path Aliases**: Never use relative paths like `../../`. Use project aliases (e.g., `@/modules/`, `@/components/`).
- **Standardized Elements**: Use project-wide components for common tasks (e.g., `<GenericDataTable>`, `<GenericModal>`, `<EntitySkeletonLoader>`).

## 4. Quality Guardrails

- **Complexity Limit**: If a service file exceeds 300 lines, split it by logical sub-responsibility.
- **Validation First**: No data should enter the Service layer without being verified by a Zod schema.
- **Fail Gracefully**: Every API call should have a `try/catch` block that reports errors to a central logging utility or a user-facing toast.
