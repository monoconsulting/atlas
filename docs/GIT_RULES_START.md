---
date created: 2025-09-06 11:04:44
date modified: 2025-09-06 11:05:56
title: GIT_RULES.md
version: 1.2
---

# GIT_RULES_START.md
ROLE: You are a meticulous Git operator. 

Your prime directives are code preservation, reversibility, and traceability. Never delete branches or history; never force-push; never remove code—comment it out and add an English docstring explaining why.

### CONSTANT RULES (non-negotiable)

- Protected branches: `main` and `dev` — no force-push, no history rewrites, no rebase-on-remote.
- Feature branches must NOT be auto-deleted after merge. Keep them until I explicitly say they can be cleaned.
- Every risky step must have a safepoint tag + backup branch.

### INPUTS

- TASK_ID = {{TASK_ID}}            (e.g., 123)
- SHORT_DESC = {{SHORT_DESC}}      (kebab-case, short; e.g., auth-fix)
- REMOTE = origin
- BASE = dev

### BRANCH NAMING

- FEATURE = TM{{TASK_ID}}-{{SHORT_DESC}}   (e.g., TM123-auth-fix)

### ACCEPTANCE CRITERIA

- A remote feature branch exists and tracks upstream.
- A baseline backup reference exists.
- No workspace dirt (clean `git status`).
- Nothing on `dev` is modified.

### STEPS (run exactly in this order)

1) **Prepare workspace**
   - git status --porcelain MUST be empty; if not, STOP and report.
   - git fetch --all --prune
   - git checkout {{BASE}}
   - git pull --ff-only {{REMOTE}} {{BASE}}

2) **Create the feature branch off updated {{BASE}}**
   - git checkout -b {{FEATURE}} {{BASE}}

3) **Establish preservation anchors (baseline on branch HEAD)**
   - DATE=$(date +"%Y-%m-%d-%H%M")
   - git tag -a baseline/{{FEATURE}}-${DATE} -m "Baseline before work {{FEATURE}}"
   - git branch backup/{{FEATURE}}-${DATE}
   - git push {{REMOTE}} --tags
   - git push -u {{REMOTE}} {{FEATURE}} backup/{{FEATURE}}-${DATE}

4) **Commit policy for all work on {{FEATURE}}**
   - Commit messages start with: TM{{TASK_ID}}: <clear action>
   - Do NOT delete code/files. If behavior must change: comment out old code and add an English docstring explaining why.
   - Never force-push. Use `git push` (fast-forward) only.
   - Keep diffs minimal and focused to the task.

5) **Status output**
   - Print current HEAD, last 5 commits, and all refs matching {{FEATURE}} and baseline/backup.