---
description: Unified "Chain of Responsibility" for catching, translating, and displaying errors across all modules.
---

# 🛡️ Error Handling Standard

This standard ensures that every failure in the system—from a database timeout to a user input error—is handled consistently and professionally.

## 1. The Error Chain

### A. Service Layer (Detection)

- **Action**: Throw specific, coded errors using a custom `AppError` class or standard `Error` with a prefix.
- **Pattern**: `throw new Error("ERR_CODE: Descriptive message")`
- **Goal**: Provide enough context for the API to translate the error.

### B. API Layer (Translation)

- **Action**: Use the global `handleApiError` utility in every `try/catch` block.
- **Pattern**:

```typescript
try {
  const result = await someService();
  return NextResponse.json({ data: result });
} catch (error) {
  return handleApiError(error);
}
```

- **Goal**: Convert internal exceptions into valid HTTP status codes (400, 404, 500) and user-friendly messages.

### C. Hook Layer (Bridging)

- **Action**: Capture the error response from the API and update the local `error` state.
- **Goal**: Pass a simplified error string to the UI.

### D. UI Layer (Presentation)

- **Action**: Use the `sonner` toast or dedicated error components.
- **Goal**: Inform the user clearly without exposing technical details.

## 2. Common Error Codes

- `DB_NOT_FOUND`: Resource doesn't exist (returns 404).
- `VALIDATION_FAILED`: User input is invalid (returns 400).
- `AUTH_DENIED`: Unauthorized access (returns 401).
- `INTERNAL_FAIL`: Unexpected crash (returns 500).

---

> [!IMPORTANT]
> Never allow an error to "swallo" without a log. Always use `console.error` in the service or API layer before returning the error to the client.
