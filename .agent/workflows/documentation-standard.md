---
description: Standards for maintaining code readability, intent, and "future-proofing" through consistent documentation.
---

# 📝 Documentation Standard

This standard ensures the codebase remains a "living document" that any developer can understand years from now.

## 1. The "Why" over the "What"

- **Rules**: Don't comment on obvious code (e.g., `i++ // increment i`).
- **Focus**: Comment on the **intent** and **business logic**. Why are we filtering for `status === 'PENDING'`? Why are we using a specific fallback ID?

## 2. JSDoc for Services & Hooks

Every function in the `services/` or `hooks/` directories MUST have a JSDoc block:

```typescript
/**
 * Fetches all records with active status and formats them for the DataTable.
 * @param {string} filter - Optional string to filter by name.
 * @returns {Promise<Entity[]>} A promise resolving to the formatted list.
 */
export const fetchAll = async (filter?: string) => { ... }
```

## 3. Type Documentation

Use inline comments in your Zod schemas or TypeScript interfaces to explain specific business rules:

```typescript
const schema = z.object({
  discount_type: z.number(), // References the 'discount_type' master collection
  is_active: z.number().default(1), // 1 = Active, 0 = Inactive (Mirroring DB flag)
});
```

## 4. README & Module Context

Every new module should have a brief explanation in its root component or a `README.md` if:

- It relies on complex cross-module dependencies.
- It has unique environment variable requirements.
- It implements a custom "Self-Healing" or "Cleanup" logic.

---

> [!NOTE]
> Code is read much more often than it is written. Write your documentation for your future self—who will have forgotten everything about this task by next month.
