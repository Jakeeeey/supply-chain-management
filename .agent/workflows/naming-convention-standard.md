---
description: Universal naming conventions for files, folders, variables, and database fields.
---

# 🏷️ Naming Convention Standard

To ensure the codebase remains readable and searchable, follow these casing and naming patterns.

## 1. Casing Styles

- **PascalCase**: Used for React Components, Providers, Interfaces, and Types.
- **camelCase**: Used for variables, functions, and React hooks.
- **kebab-case**: Used for folders, standard files (non-component), and API slugs.
- **snake_case**: Used strictly for Directus database fields and raw API responses.

## 2. File & Directory Patterns

- **Directory**: Always use `kebab-case` (e.g., `data-table`, `sku-creation`).
- **Components**: Always use `PascalCase` with the `.tsx` extension (e.g., `MainPage.tsx`, `StandardModal.tsx`).
- **Hooks**: Start with `use` in `camelCase` (e.g., `useEntity.ts`, `useAuth.ts`).
- **Services/Utils**: Use `kebab-case` (e.g., `entity-service.ts`, `date-helpers.ts`).
- **Schemas**: Always suffix with `.schema.ts` (e.g., `entity.schema.ts`).

## 3. Component & Function Naming

- **Boolean Prefixes**: Use `is`, `has`, or `should` for boolean variables (e.g., `isLoading`, `hasPermission`).
- **Event Handlers**: Prefix with `handle` for logic functions (e.g., `handleSubmit`, `handleDelete`).
- **Prop Callbacks**: Prefix with `on` (e.g., `onValueChange`, `onClose`).
- **Service Functions**: Use clear action verbs (e.g., `fetchAll`, `getById`, `upsertRecord`).

## 4. Database vs Frontend Mapping

- **Frontend State**: Map to `camelCase` where possible to match TypeScript conventions, unless using the raw Directus object directly.

---

> [!NOTE]
> Consistency in naming is the difference between a project that's easy to navigate and one that's a maze. Always rename a file if it doesn't follow these patterns.