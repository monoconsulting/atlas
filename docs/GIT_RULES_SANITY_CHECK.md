---
date created: 2025-09-06 11:04:44
date modified: 2025-09-06 11:05:56
title: GIT_RULES.md
version: 1.2
---

# GIT_RULES.md
**Rules (must):**

- Never commit on `dev` or `main`. Work **only** on a short-lived task branch from `origin/dev`.
- Branch name: `TM<id>-<short-desc>` (ASCII, hyphens only; e.g., `TM427-Add-batch-UI`).
- Keep the task branch rebased on `origin/dev`. Integrate to `dev` with **fast-forward only**.
- Code preservation: no deletions to “make it work”; comment out old code and explain in English.

**Start work (every session):**

```
git fetch --all --prune --tags
git switch dev && git reset --hard origin/dev
git switch -c TM123-Short-desc
git push -u origin HEAD
```

**Stay current while coding (repeat as needed):**

```
git fetch --all --prune --tags
git rebase origin/dev              # resolve → git add -A → git rebase --continue
git push || git push --force-with-lease
```

**Integrate finished work into dev (fast-forward only):**

```
git fetch --all --prune --tags
git switch dev && git reset --hard origin/dev
git merge --ff-only TM123-Short-desc
git push && git tag -a safepoint-dev-$(date +%Y%m%d-%H%M) -m "After TM123-Short-desc" && git push --tags
git push origin :TM123-Short-desc || true   # delete remote task branch
```

**Sanity check (no regressions):**

```
git rev-list --left-right --count dev...origin/dev   # expect "0 0"
git log origin/dev --oneline --decorate --graph -10
```