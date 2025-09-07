---
date created: 2025-09-06 11:04:44
date modified: 2025-09-06 11:05:56
title: GIT_RULES_FILES_EXISTS.md
version: 1.2
---

# GIT_RULES_FILES_EXISTS.md

FILES EXIST IN COMMIT

1) Fetch refs and create a clean “housekeeping” branch from the current state:

   ```
   git fetch --all --prune
   git checkout -b HOUSEKEEPING/$(date +"%Y-%m-%d-%H%M")-pre-TM167
   ```

   

2) Add and commit EVERYTHING shown in status (NOTHING gets discarded):

   ```
   git add -A
   git commit -m "HOUSEKEEPING: Preserve uncommitted changes before TM167 start
   ```
- Modified: .taskmaster/tasks/tasks.json
- Untracked: docs/GIT_RULES_*.md
- Untracked: recovered_tasks_166_and_later.json"

3) Create a safepoint tag + backup branch and push both:
   
   ```
   DATE=$(date +"%Y-%m-%d-%H%M")
   git tag -a safepoint/HOUSEKEEPING-${DATE} -m "Safepoint before TM167"
   git branch backup/HOUSEKEEPING-${DATE}
   git push origin --tags
   git push -u origin HEAD
   ```
   
   
   
4) Return to a clean `dev` (we do NOT bring housekeeping into dev now):
   
   ```
   git checkout dev
   git pull --ff-only origin dev
   git status --porcelain   # Should be empty
   ```
   
   
   
5) Now start TM167 using our start rules (create feature branch from dev):
   
   (Follow our standard prompt: TM{ID}-{desc}, baseline tag, backup branch, etc.)

### IMPORTANT:

- The housekeeping branch remains on origin (NOTHING is deleted).
- When/if we want these files in TM167, bring them in via:
  a) git cherry-pick <commit-sha> from the HOUSEKEEPING branch, OR
  b) git merge --no-ff HOUSEKEEPING/... into the feature branch (never directly into dev).
- **Nothing may disappear from `dev`. All changes happen in a feature branch and are merged in a controlled way.**

Report:
- Name of the created HOUSEKEEPING branch
- Commit SHA, tag, and the output of `git ls-remote --heads origin | grep HOUSEKEEPING`
- `git status` on `dev` (must be clean)xxxxxxxxxx git rev-list --left-right --count dev...origin/dev   # expect "0 0"git log origin/dev --oneline --decorate --graph -10