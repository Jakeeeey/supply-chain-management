---
description: Universal standards for separating UI, State, and Business Logic across any module.
---

# 🏗️ Logic Layering Standard

To ensure every module is scalable and testable, strictly follow this 4-layer architecture.

## 1. The Service Layer (`/services/`)

- **Sub-Layer: Repository (`[name].repo.ts`)**: The ONLY place where `fetch()` or Directus API calls occur. Zero business logic. Must return strictly typed Enriched or Raw objects.
- **Sub-Layer: Orchestration (`[name].service.ts`)**: Coordinates multiple repository calls. Handles business logic, status transitions, and data composition. Never calls `fetch()` directly.
- **Sub-Layer: Helpers (`[name].helpers.ts`)**: Pure TypeScript utility functions (no Side Effects).
- **Independence**: All service logic must be pure TypeScript (no React hooks) to run in both Server Components and API Routes.

## 2. The API Layer (`/api/`)

- **Gateway**: These handlers act as thin wrappers around Services.
- **Validation**: Use Zod to validate `POST` and `PATCH` payloads immediately.
- **Standard Response**: Every endpoint must return a consistent JSON structure.

## 3. The Hook Layer (`/hooks/`)

- **Bridge**: Hooks manage the relationship between the UI and the API.
- **Standard Return**: `{ data, isLoading, error, refresh }`.
- **Optimization**: Use `useCallback` for functions and `useMemo` for heavy data formatting to prevent unnecessary re-renders.

## 4. The Component Layer (`/components/`)

- **UI Only**: Components should strictly handle the view and user events.
- **Zero-Logic**: If a component has complex data transformations or state syncing, move it into a custom Hook.

---

> [!TIP]
> This layering allows us to swap a UI library or a backend database without rewriting the entire system.
