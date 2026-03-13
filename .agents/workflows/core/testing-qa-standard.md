---
description: The final quality gate for verifying that a feature is robust, bug-free, and premium.
---

# ✅ Testing & QA Standard

Before marking any task as complete, every developer and agent must pass through this quality checklist.

## 1. Functional Verification

- [ ] **Positive Path**: Does the main feature work as intended? (e.g., Can I save a record?)
- [ ] **Negative Path**: Does it handle failure gracefully? (e.g., What happens if I save empty fields?)
- [ ] **Edge Cases**: Test with very long strings, zero values, or special characters.
- [ ] **Persistence**: Refresh the page after saving. Does the data stay exactly as entered?

## 2. API & Network Health

- [ ] **Network Tab**: Open the browser tools. Are there any `4xx` or `5xx` errors during interaction?
- [ ] **Console**: Is the browser console free of red errors and "Warning: Each child in a list should have a unique key"?
- [ ] **Payloads**: Verify that the data sent to the API is clean (no extra or missing fields).

## 3. Visual & UX Consistency

- [ ] **Hover States**: Verify that all buttons and rows have appropriate interactive highlights.
- [ ] **Theme Toggle**: Check the implementation in both Light and Dark modes.
- [ ] **Screen Sizes**: Resize the browser to ensure no elements overlap or "break" on smaller screens.
- [ ] **Cancellation**: Does the "Cancel" or "Close" button work without side effects or "stuck" loading states?

## 4. Final Cleanup

- [ ] **Logs**: Remove any unnecessary `console.log` statements used during development.
- [ ] **Imports**: Ensure there are no unused imports (greyed out in the editor).
- [ ] **Comments**: Remove any "TODO" comments unless they are explicitly tracked for the future.

---

> [!IMPORTANT]
> A feature is only 50% done when the code is written. It is 100% done only after it passes this checklist.
