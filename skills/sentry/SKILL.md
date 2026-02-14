---
name: sentry
description: Investigate Sentry issues and errors using the sentry-cli
allowed-tools: Bash(sentry-cli:*), Read, Grep, Glob, Edit
argument-hint: [optional: issue ID]
---

# Sentry

Investigate Sentry issues and errors using `sentry-cli`.

## Instructions

1. Based on $ARGUMENTS, run `sentry-cli issues list` directly:
   - **No arguments**: `sentry-cli issues list -s unresolved --max-rows 10`
   - **Issue ID provided**: `sentry-cli issues list -i <ID>`

2. If the command fails due to missing authentication or configuration, help the user create a `.sentryclirc` in the project root:

   ```ini
   [auth]
   token=<ask user for their token>

   [defaults]
   org=<ask user for org slug>
   project=<ask user for project slug>
   ```

   Make sure `.sentryclirc` is listed in `.gitignore` since it contains the auth token. Then retry the command.

3. Analyze the issues found. For each relevant issue, identify the likely root cause by reading the referenced source files.

4. If the user wants a fix, apply it directly. Otherwise, summarize findings and suggest next steps.

## Tips

- Use `sentry-cli issues list --query "is:unresolved level:error"` for unresolved errors only
- Use `--max-rows` and `--pages` to limit output
- Always prefer `sentry-cli` over the Sentry MCP or API
