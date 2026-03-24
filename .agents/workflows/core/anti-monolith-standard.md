---
description: Standards for identifying and preventing "Feature Monoliths" in Service and Hook layers.
---

# 🛑 Anti-Monolith Standard

A "Feature Monolith" occurs when a single file or hook takes on too many responsibilities, making it brittle, hard to test, and difficult to maintain. Follow these heuristics to identify and fix them early.

## 1. How to Identify a Monolith

### 🧪 Metric A: The "300 Line" Rule

- **Service Files**: If a `.ts` service file exceeds **300 lines**, it must be split by logical sub-responsibility (e.g., `query`, `lifecycle`, `approval`).
- **Hook Files**: If a custom hook exceeds **150 lines** (excluding boilerplate), it is likely doing too much orchestration.

### 🧪 Metric B: Domain Overlap

- Does the service manage distinct "State Modes"? (e.g., **Draft** vs. **Master Record**).
- If a service handles the transition between two modes (like an Approval workflow), that workflow should live in its own dedicated service file (`sku-approval.ts`), separate from standard CRUD.

### 🧪 Metric C: Hook Breadth (State Monoliths)

- **Table Count**: A single hook should ideally manage state for **one major table**.
- If a hook manages state for **3+ distinct tables** (e.g., Drafts, Pending, and Masterlist), it is a "State Monolith".
- **Solution**: Split into sub-hooks (e.g., `useDrafts`, `useApproved`) and use a **Composer Hook** to join them if the page needs all of them.

### 🧪 Metric D: Action Count

- If a service has **5+ distinct "Write" actions** (e.g., Create, Update, Submit, Approve, Reject, Delete, Toggle), it should be decomposed.

---

## 2. The "Decomposition" Pattern

When a module grows complex, follow the **Barrel & Composer** pattern used in the SKU module:

### 2.1 The 5-File Tiered Service (Standard)

When decomposing a complex service, split it into these 5 specialized files to ensure zero logic overlap:

1.  **`[name].types.ts`**: Pure TS interfaces (No Zod).
2.  **`[name].schema.ts`**: All Zod validation (POST/PATCH).
3.  **`[name].helpers.ts`**: Pure utility functions.
4.  **`[name].repo.ts`**: Directus `fetch` calls only.
5.  **`[name].service.ts`**: Orchestration & Business Logic.

**Barrel File**: Maintain an `index.ts` to re-export the Service and Repo methods, ensuring no breaking changes for UI callers.

### 2.2 Hook Decomposition (Composers)

1.  Extract state slices into "Sub-Hooks" (e.g., `useModuleDrafts.ts`).
2.  Repurpose the main `useModule.ts` as a **Composer Hook**.
3.  The Composer calls the sub-hooks and merges their returns into a single API.
4.  **Benefit**: Keeps the UI simple while keeping state logic modular.

---

## 3. Red Flags in Code Reviews

- `[ ]` A service file has `// --- Section ---` comments to separate logic. (Sign of a monolith).
- `[ ]` A hook has 10+ `useState` or `useCallback` declarations.
- `[ ]` A single service file imports from 5+ different Directus collections.
