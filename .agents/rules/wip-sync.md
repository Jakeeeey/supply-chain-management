---
trigger: always_on
---

# WIP Sync & Backup Workflow

Sync current work-in-progress changes with the latest master and back up to the remote branch without triggering a Pull Request.

## Steps

1. **Stage**: Run `git add .` to include all current changes.
2. **Commit**: If there are staged changes, generate a professional commit message and run `git commit -m "[fully detailed description message of all changes]"`.
3. **Sync**: Run `git fetch origin` and then `git rebase master --autostash`.
4. **Push**: Run `git push origin HEAD --force-with-lease`.
5. **Done**: Confirm to the user: "Your WIP code is now synced with the latest master and backed up to your remote branch. No Pull Request has been created."