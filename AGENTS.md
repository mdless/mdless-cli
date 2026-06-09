# mdless-cli

CLI tools for Claude Code developers.

## Development

This project uses Bun and runs TypeScript directly without a build step.

### Setup

```bash
npm link
```

### Testing

After making changes, test by running `mdless` in any terminal - changes are reflected immediately.

### Documentation

Always update `README.md` after changing the code, so the docs and behavior stay in sync.

### Releasing

```bash
npm version patch  # bumps version and creates git tag
git push && git push --tags
npm publish
```

## Commands

- `mdless` - Interactive mode with command menu
- `mdless init` - Copy default agent prompts into `.mdless/agents/`
- `mdless work` - Launch agents in `.mdless/agents/` in a tmux session
- `mdless agent <name>` - Run a single agent loop from `.mdless/agents/<name>.md`
