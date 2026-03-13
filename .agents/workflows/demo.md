---
description: Ready-to-use Master Prompt for building any new standardized module.
---

# 🚀 Master Module Builder Prompt

Copy and paste the block below to start building a new feature. Choose the **Strategy** that fits your requirements.

---

### [MODULE NAME] Build Request

**Goal**: [DESCRIBE THE GOAL/FIELDS HERE]

**Required Strategy**: [CHOOSE ONE: **Standard** | **Orchestrated**]

---

## 🛠️ Strategy Guide

### 📂 PATH A: Standard (Fast-Track)

Best for: Simple lookups, single tables, or minor features.

1.  Use `/core/create-new-module` for the initial setup.
2.  Follow all `@/core` standards.
3.  Direct implementation in one pass.

### 📂 PATH B: Orchestrated (Team Mode)

Best for: Complex subsystems, multi-step lifecycles, or high-risk business logic.

1.  **Phase 1 (PM Agent)**: Execute `/orchestration/pm-agent` to map fields.
2.  **Phase 2 (Architect Agent)**: Execute `/orchestration/architect-agent` for complexity audit.
3.  **Phase 3 (Dev Agent)**: Execute `/orchestration/dev-agent` for implementation.
4.  **Phase 4 (QA Agent)**: Execute `/orchestration/qa-agent` for final polish.

---

> [!IMPORTANT]
> When choosing **Orchestrated Mode**, I will pause for your approval after **Phase 2 (Architect)** to ensure the system design perfectly matches your vision before I write any code.
