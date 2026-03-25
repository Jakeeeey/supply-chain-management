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
├── hooks/               # Custom React hooks (Data fetching & state)
├── services/            # Business Logic & I/O
│   ├── [name].repo.ts     # Directus I/O only (No business logic)
│   ├── [name].service.ts  # Logic orchestration (Calls repo, no fetch)
│   ├── [name].helpers.ts  # Pure utility functions
│   └── index.ts           # Barrel file
├── types/               # Type and Validation Definitions
│   ├── [name].types.ts    # TS interfaces only
│   └── [name].schema.ts   # Zod schemas (Import from .types)
└── [Module]Page.tsx     # Main entry point for the module
```

### 1.2 The "Dispatch Pattern" (Standard for Complex Modules)

When a module involves multi-table writes or complex orchestration, follows this 5-file split:

1.  **`.types.ts`**: All TypeScript interfaces. No Zod.
2.  **`.schema.ts`**: All Zod schemas. Handles all `POST` and `PATCH ?action=` validations.
3.  **`.helpers.ts`**: Pure functions. No side effects.
4.  **`.repo.ts`**: All Directus `fetch` calls. Zero business logic.
5.  **`.service.ts`**: Orchestration logic. Calls Repo & Helpers. Thin `route.ts` calls this.

## 2. The Data Flow Protocol

- **One-Way Flow**: View (Component) -> State (Hook) -> Backend (API) -> Domain Logic (Service).
- **Single Source of Truth**: Fetch data once at the hook level; pass necessary slices to nested components via props or Context.

## 3. Implementation Rules

- **3.1 Technical Standards**:
  - **Explicit Returns**: Always define return types for Service and API functions.
  - **Path Aliases**: Never use relative paths like `../../`. Use project aliases (e.g., `@/modules/`, `@/components/`).
  - **Standardized Elements**: Use project-wide components for common tasks (e.g., `<GenericDataTable>`, `<GenericModal>`, `<EntitySkeletonLoader>`).

- **3.2 Agentic Orchestration Protocol**:
  - When running in **Orchestrated Mode**, the AI must explicitly switch "personas" by referencing the corresponding agent file in `.agent/workflows/orchestration/`.
  - No code should be written until the **Architect Agent** has produced and the user has approved an `implementation_plan.md`.
  - Every complex module must pass a **QA Agent** audit before the task is marked as complete.

## 4. Quality Guardrails

- **Complexity Limit**: Avoid "Feature Monoliths". If a service exceeds 300 lines or a hook manages state for 3+ major tables, split it. See [/anti-monolith-standard](file:/.agent/workflows/anti-monolith-standard.md) for heuristics.
- **Validation First**: No data should enter the Service layer without being verified by a Zod schema.
- **Fail Gracefully**: Every API call should have a `try/catch` block that reports errors to a central logging utility or a user-facing toast.