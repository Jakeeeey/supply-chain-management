---
description: Create a complete, standardized module from scratch following project architecture rules.
---

# 🏗️ New Module Creation Workflow

When the user asks to "Create a new module" for a specific domain (e.g., Inventory, Payroll), follow these steps strictly without needing further file-by-file instructions.

## 1. Planning Phase

- Reference `.agent/workflows/architecture-rules.md` for the blueprint.
- Identify the subsystem and logical sub-modules (e.g., Creation, Approval, Masterlist).
- **Pro Tip**: If the module has distinct lifecycle states, follow the **Granular Sub-Module Architecture** standard.
- Map the provided fields to a Zod schema.

## 2. Implementation Order (DO ALL STEPS)

### Step 1: Data Contract (`types/`)

- Create `[module].schema.ts`.
- Define `z.object` for the form and the API response.
- Export inferred Types using `z.infer`.

### Step 2: Server Service (`services/`)

- Create `[module].ts` (Server Service).
- Implementation: `fetchAll`, `fetchById`, `create`, `update`, `delete`.
- Use `process.env.NEXT_PUBLIC_API_BASE_URL` and `process.env.DIRECTUS_STATIC_TOKEN`.

### Step 3: Local API (`api/`)

- Create `api/route.ts` (or relevant handler logic).
- Implement clean GET, POST, PATCH handlers that call the service.
- Maintain compatibility with `app/api/` as the entry point.

### Step 4: Client Bridge (`hooks/` & `providers/`)

- Create `use[Module].ts` in `hooks/`.
- Create `[Module]Provider.tsx` in `providers/` for shared module state.
- Abstract fetching state: `{ data, isLoading, error, refresh }`.

### Step 5: User Interface (`UI`)

- Create `[Module]Page.tsx`.
- Use `@/app/(financial-management)/path_name/_components/DataTableSkeleton` for loading.
- Use `@/app/(financial-management)/path_name/_components/ErrorPage` for errors.
- Ensure all formatting (Currency, Date) uses `@/lib/utils`.

## 3. Completion Checklist

- [ ] No relative imports (use `@/`).
- [ ] Zod validation on POST/PATCH.
- [ ] Logic separated (Component -> Hook -> API -> Service).
- [ ] Consistent table styling.
