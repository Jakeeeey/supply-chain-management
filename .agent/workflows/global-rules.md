---
description: The Project Constitution - Global standards for structure, logic, and UI to prevent technical debt and "ugly" code.
---

# 📜 THE PROJECT CONSTITUTION

This document is the "Source of Truth" for the entire repository. Every AI Agent and Developer must adhere to these standards to maintain a premium, scalable system.

## 1. The Core Philosophy
- **Clean Layers**: Component (UI) → Hook (State) → API (Gateway) → Service (Logic) → DB.
- **Zero-Logic Components**: If a component has more than 5 lines of `useEffect` or `fetch`, move it to a Hook.
- **Single Responsibility**: One service file per Directus collection.

## 2. Directory "Holy" Structure
Never deviate from this root organization:
- `/app/api/[subsystem]/[domain]` -> All Backend Endpoints.
- `/modules/[subsystem]/[domain]` -> The entire Frontend Domain (Types, Hooks, Services, UI).
- `/lib` -> Global Shared Utilities (Formatting, Auth).
- `/components/ui` -> Pure primitive UI components (Shadcn).

## 3. Mandatory Global Components
The following MUST be used in every data-driven page:
1. **DataTableSkeleton**: For all loading states.
2. **ErrorPage**: For all failed API connections.
3. **formatPHP**: For all currency displays.
4. **formatDate**: For all date displays.

## 4. Bootstrapping a New Module (The Law)
When asked to create a module, ALWAYS generate these 5 layers:
1. `types.schema.ts` (The Contract)
2. `services/entity.ts` (The Brain)
3. `api/route.ts` (The Gate)
4. `hooks/useEntity.ts` (The Bridge)
5. `EntityPage.tsx` (The View)

---

> **Usage**: Run `/initialize` to setup the environment or `/create-module` to expand the system.
