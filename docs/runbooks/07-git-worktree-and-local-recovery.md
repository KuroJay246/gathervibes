# Runbook 7. Git Worktree and Local Recovery

## Purpose

Repair local repository problems including worktree confusion and apparent loss of uncommitted work.

## Symptoms

- Git worktree confusion.
- Lost or uncommitted local changes.

## Severity

Medium to High depending on whether unrecoverable local work is at risk.

## Possible causes

- Editing the wrong worktree.
- Detached expectations about `main` versus a docs branch.
- Untracked generated artifacts masking real diffs.

## Safety warnings

- Do not use `git reset --hard` as a first response.
- Do not delete worktrees or untracked files until the owner confirms they are disposable.

## Evidence to collect

- `git status --short --branch`
- `git worktree list --porcelain`
- `git rev-parse HEAD`
- Paths of modified or untracked files

## First checks

1. Confirm the current repository path.
2. Confirm the current branch name.
3. Confirm whether the missing work was ever committed in another worktree.

## Files to inspect

- `.git`
- Worktree list output
- Any changed source or artifact folders involved in the confusion

## Commands to run

- `git status --short --branch`
- `git worktree list --porcelain`
- `git log --oneline --decorate -n 20`

## Step-by-step diagnosis

1. Identify the active worktree and its branch.
2. Check whether the missing change exists in another local worktree or recent commit.
3. Separate generated artifacts from handwritten source changes.
4. Stage or copy only after the real source of truth is identified.

## Repair options

- Switch to the intended branch/worktree.
- Commit recoverable work on a safe branch.
- Remove only confirmed disposable generated artifacts.

## Verification

- The correct branch/worktree contains the intended source changes.
- `git status` is understandable and no owner work was destroyed.

## Rollback

- Restore from the branch or commit where the work last existed.

## Escalation conditions

- A required worktree is missing or corrupted.
- The only apparent recovery path would discard unreviewed owner changes.

## Search keywords

- git worktree confusion
- lost local changes
- wrong branch
- clean tree mismatch

## Related tests

- No direct tests; use Git evidence and repo validation after recovery.

## Related manual sections

- Change Management
- Documentation Maintenance Procedure
