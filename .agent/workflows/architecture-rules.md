---
description: Architectural standards for building and refactoring modules in the [Module Name] Management system.
---

# Architecture Rules & Module Standards

All new modules and refactorings must strictly follow this domain-driven layered architecture. This ensures consistency, maintainability, and clear separation of concerns.

## 1. Folder Structure

Every module under `src/modules/[subsystem]/[module-name]/` must follow this structure:

```text
├── api/                # Module-specific Local API Route Handlers
├── components/          # UI Components
│   ├── data-table/      # Columns, headers, pagination, skeleton-loader
│   ├── forms/           # Pure React Hook Form + Zod form components
│   └── modals/          # Dialog wrappers (View/Add/Edit/Delete)
├── hooks/               # Client-side state & fetching hooks (e.g., use[Entity])
├── services/            # Server-side business logic & DB interactions
├── providers/           # Module-specific Context Providers for state management
├── types/ or types.ts   # Zod Schemas and inferred TypeScript types
├── utils/               # Module-specific helpers
└── [ModuleName]Page.tsx # The root entry point component
```

## 2. Layer Responsibilities

### Use Client vs Server

- **Services**: MUST be pure TypeScript. No React hooks. No `@/hooks` imports. They should be usable in both Server Components and API Routes.
- **Hooks**: MUST be `use client`. They manage loading/error/data states.
- **Components**: Prefer `use client` for interactive elements but keep them as "pure" as possible by delegating logic to hooks.

### The Service Layer (`/services/`)

- All external fetching (Directus, third-party APIs) must happen here.
- Handle data transformation and mapping here.
- Service functions should throw descriptive errors that can be caught by API handlers or hooks.

### The API Layer (`app/api/`)

- Keep handlers thin.
- Responsibilities: Request validation (Zod), Authentication, Calling Service functions, Standardized JSON response formatting.

### The Hook Layer (`/hooks/`)

- Standard return format: `{ data, isLoading, error, refresh, ...extra }`.
- Use `useCallback` for fetch/refresh functions to prevent re-render loops.
- Use `useMemo` for client-side filtering or heavy calculations.

## 3. Data Flow Patterns

1. **Fetch**: Component -> Hook -> Local API -> Service -> Database.
2. **Mutation**: Component -> Modal -> Service -> Refresh Hook.

## 4. Coding Standards

- **Zod**: Always use `schema.parse()` or `schema.safeParse()` for data coming from the user or external APIs.
- **Path Aliases**: Always use `@/modules/...`, `@/components/ui/...`, or `@/lib/...`. Avoid relative paths like `../../../`.
- **Forms**: Use Shadcn `Form` components with `react-hook-form` and `zodResolver`.
- **Toasts**: Use `sonner` for all user feedback notifications.

## 5. UI/UX Consistency

- Use `<ErrorPage />` from common components for failed data connections.
- Use standardized skeleton loaders during `isLoading` states.
- Tables should utilize `@tanstack/react-table` patterns.