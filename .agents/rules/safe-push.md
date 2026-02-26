---
trigger: always_on
---

[Important Notes]: Ask user for confirmation if the code is ready for product!

# Safe Push & PR Workflow
Stage changes, sync with master, push safely, and create/update a PR.

## Steps

1. **Stage**: Run `git add .` to include all current changes.
2. **Commit**: If there are staged changes, generate a professional commit message and run `git commit -m "[message]"`.
3. **Sync**: Run `git fetch origin master:master` and then `git rebase master --autostash`.
4. **Push**: Run `git push origin HEAD --force-with-lease`.
5. **PR**:
   - Check if a PR already exists for this branch using `gh pr view`.
   - If no PR exists, run `gh pr create --fill`.
   - If a PR exists, notify the user that the PR has been updated.
6. **Done**: Confirm to the user that the code is live and the PR is ready.


