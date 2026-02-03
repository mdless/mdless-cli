---
name: pr
description: Commit changes, push, and create/update a pull request
allowed-tools: Bash(git:*), Bash(gh:*), Read, Edit
argument-hint: [optional: branch/commit message guidance]
---

# Create PR

Commit changes, push, and create/update a pull request.

## Instructions

1. Check `git status` and current branch
2. If on main/master, create a feature branch. Otherwise stay on current branch.
3. Stage and commit changes using conventional commit format
4. Push to origin (use `-u` if branch is new)
5. Check if PR exists with `gh pr view`
6. If no PR, create one with `gh pr create` (include a summary of the changes)
7. Open in browser with `gh pr view --web`

Use $ARGUMENTS as guidance for branch name and commit message.
