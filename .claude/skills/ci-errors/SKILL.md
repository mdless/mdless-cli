---
name: ci-errors
description: Fetch failing CI logs for the current PR, analyze errors, and fix them
allowed-tools: Bash(gh:*), Bash(git:*), Read, Grep, Glob, Edit
argument-hint: [optional: specific check name to focus on]
---

# CI Errors

Fetch failing CI logs for the current PR, analyze the errors, and fix them.

## Instructions

1. Run `gh pr view --json number,title,headRefName` to confirm there is an open PR. If not, stop.

2. Get failing checks:
   ```bash
   gh pr checks --json name,bucket,link,state --jq '[.[] | select(.bucket == "fail")]'
   ```
   If no checks are failing, tell the user and stop. Filter by $ARGUMENTS if provided.

3. Extract `run_id` and `job_id` from each failing check link (format: `.../actions/runs/<run_id>/job/<job_id>`).
   Fetch logs with `gh run view <run_id> --log-failed`. Fall back to annotations if unavailable.

4. Categorize each failure (test, lint/type, build, or other) and identify the root cause.

5. Fix each error: read the source, apply the fix, explain what changed.

6. Summarize what was fixed and suggest the user re-run CI.
