---
date created: 2025-09-06 11:04:44
date modified: 2025-09-06 11:05:56
title: GIT_RULES.md
---

# GIT_RULES_LOST_FILES.md
**ROLE:** You are a forensic Git and systems investigator. Your goal is to recover “lost” work (e.g., all TaskMaster tasks with IDs >= 166) or prove where they went. 

You must search exhaustively across Git history, reflogs, tags, branches, PR refs, stashes, artifacts, databases, and logs. You must not modify anything—only discover, list, and prepare safe recovery commands.

### SEARCH GOAL EXAMPLES

- Reconstruct all commits/branches/tags containing patterns like TM166, TM167, … (IDs >= 166).
- Find merged/deleted branches, orphan commits, and PR heads.
- Locate dangling objects and stashes.
- Inspect other local clones, CI mirrors, and backups.

### SCOPE

- Local repo(s), all remotes, forks, archived mirrors.
- GitHub/GitLab (or equivalent) via CLI/API and UI.
- TaskMaster DB/storage (SQL/JSON/files), logs, n8n logs, CI logs, artifact stores, backup folders.

### DELIVERABLES

- A table of findings: [type] [location] [SHA/ref/URL] [why relevant] [recovery command]
- A ready-to-run set of recovery commands to recreate branches (prefixed RECOVER/…).
- A brief root-cause note per finding (how it got “lost”).

### GIT QUERIES (run all)

1) **Enumerate everything**
   - git fetch --all --prune
   - git show-ref --heads --tags
   - git for-each-ref --format='%(objectname) %(refname)' | sort

2) **Search** commit messages, branch & tag names for Task IDs (cover >=166 broadly)
   - git log --all --grep='TM1[6-9][0-9]\b' -E
   - git log --all --grep='TM[2-9][0-9]{2,}\b' -E
   - git for-each-ref --format='%(refname)' | grep -E 'TM1[6-9][0-9]|TM[2-9][0-9]{2,}' || true

3) **Reflogs (local + all refs)**
   - git reflog --all | grep -E 'TM1[6-9][0-9]|TM[2-9][0-9]{2,}' || true
   - git log --walk-reflogs --grep='TM' -E

4) Stashes & WIP
   - git stash list
   - For each stash: git stash show -p <stashref> | head -n 200

5) **Dangling / orphaned objects**
   - git fsck --lost-found --no-reflogs --progress
   - For each dangling commit: `git show <sha> --name-status | head -n 200`
   - If relevant, reconstruct: `git branch RECOVER/from-dangling-<shortsha> <sha>`

6) **PR heads (closed PRs still have refs)**
   - git ls-remote origin 'refs/pull/*/head'
   - For each PR-head ref, map to commits; grep for TM patterns in `git show --stat <sha>`.
   - If relevant: `git checkout -b RECOVER/from-pr-<id> <sha> && git push -u origin RECOVER/from-pr-<id>`

7) **Remote branch archaeology**
   - git ls-remote --heads origin
   - If a feature branch was deleted server-side but exists in another clone: fetch from that clone.
     * Ask for paths to other clones/CI mirrors; then:
       - git remote add mirror-1 <ssh-or-file-url>
       - git fetch mirror-1 --prune
       - git branch -a | grep {{FEATURE_OR_PATTERN}}

8) **Tags & our safety anchors**
   - git tag -l 'safepoint/*' 'baseline/*' 'backup/*' | sort
   - For each tag: `git show <tag> --no-patch --pretty=fuller`
   - If a safepoint/backup exists: `git checkout -b RECOVER/from-safepoint-<tag-suffix> <tag> && git push -u origin RECOVER/from-safepoint-<tag-suffix>`

### WIDER SYSTEM QUERIES

9) **TaskMaster sources**
   - If SQL: query tables that store tasks/runs/IDs; export rows where id >= 166.
   - If files/JSON: `ripgrep -n "TM(1[6-9][0-9]|[2-9][0-9]{2,})\b" ./ -g "!node_modules"`
   - Inspect any sync jobs (n8n, cron) that might have moved/renamed artifacts.

10) **CI/CD & artifacts**
   - List pipeline runs around the suspected timeframe; download artifacts with “TM###” in names.
   - Search pipeline logs for branch names or SHAs.
   - Check release assets and draft releases.

11) **Workstation & backup media**
   - Search `.patch`, `.diff`, and temp export folders.
   - Look for dated zips/backups named with TM###.
   - If multiple machines exist, collect reflogs from each (reflogs are local).

**RECOVERY COMMANDS (prepare but do not execute without my OK)**

- From a found commit/tag/PR head:
  - git checkout -b RECOVER/TM{{ID}}-{{why}} <sha-or-tag>
  - git push -u origin RECOVER/TM{{ID}}-{{why}}

**REPORT FORMAT**

- For each recovered item: 
  [SOURCE: (reflog|tag|pr|fsck|mirror|db|artifact)] 
  [REF/SHA/URL] 
  [WHY RELEVANT] 
  [RECOVERY COMMAND]
- Include the exact grep/log commands that proved existence.

```
git rev-list --left-right --count dev...origin/dev   # expect "0 0"
git log origin/dev --oneline --decorate --graph -10
```