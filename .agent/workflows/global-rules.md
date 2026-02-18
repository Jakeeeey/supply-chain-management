---
description: The Project Constitution - Global standards for structure, logic, and UI to prevent technical debt and "ugly" code.
---

# 📜 GLOBAL STANDARDS CONSTITUTION

This document serves as the "Source of Truth" for development across the entire system. Adherence is mandatory for all features.

## 1. Core Principles

- **DRY (Don't Repeat Yourself)**: If an utility or UI component is used in more than two modules, it must move to the global `/lib` or `/components/ui/` directories.
- **Separation of Concerns**: Keep UI files clean. One file = one responsibility.
- **Performance First**: Optimistic updates are preferred for standard actions, while high-risk actions must show a distinct loading state.

## 2. Directory Governance

- **`/app/`**: Focused on routing and API entry points.
- **`/modules/`**: The core "brain" of the application. Everything required for a feature should live here.
- **`/components/`**: Only for pure, reusable UI elements.
- **`/lib/`**: For strictly stateless utility functions.

## 3. Mandatory UI Elements

Every data-driven view MUST implement:

- **Skeleton Loaders**: Custom refined loaders that match the expected content shape.
- **Standard Formatting**: Use the centralized utility functions for all displayed metrics (Currency, Date, Percentage).
- **Error Boundaries**: Use the global error page for any failed data fetch or component crash.

## 4. Feature Life-Cycle

When adding any new capability to the system:

1. Define the Data Contract (`types/`).
2. Implement the Business Intelligence (`services/`).
3. Create the Network Gateway (`api/`).
4. Build the State Bridge (`hooks/`).
5. Design the Premium Interface (`components/` & `Page`).

---

> [!NOTE]
> Consistency is the key to a premium product. Every module should feel like it was built by the exact same designer and developer.
