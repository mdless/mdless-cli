---
name: pr-comments
description: Review and respond to PR comments
allowed-tools: Bash(gh:*), Bash(git:*), Read, Edit
argument-hint: [optional: e.g. "reply to antoine saying we should add tests"]
---

# PR Comments

Review and respond to comments on a pull request.

## Instructions

1. Get the PR number: `gh pr view --json number -q .number`

2. Fetch review comments using `gh api` for the current PR

3. For each comment, show: file, line, author, body. Then suggest either:
   - A code fix (if requesting a change)
   - A reply (if it's a question/discussion)

4. Ask the user what to do: apply fix, reply, skip, or custom action

5. Execute: for fixes, edit/commit/push. For replies, post via `gh api`.

Use $ARGUMENTS to guide actions (e.g., "fix all issues" or "reply to antoine").
