---
name: commit
description: Stage and commit changes with a conventional commit message
allowed-tools: Bash(git:*)
argument-hint: [optional: what to commit]
---

# Commit

Stage and commit changes using conventional commit messages.

## Instructions

1. Check `git status --short` to see what changes exist
2. Stage relevant files for commit
3. Verify nothing is staged that shouldn't be
4. Create a commit using conventional format: `<type>: <description>`

Only push the commit if specifically instructed to do so.

## Conventional Commit Types

`feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore` | `ci`

Description: short summary (50 chars or less), lowercase, no period.

Use $ARGUMENTS as guidance for what to commit. If not provided, commit all unstaged changes.
