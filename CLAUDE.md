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

### Releasing

```bash
npm version patch  # bumps version and creates git tag
git push && git push --tags
npm publish
```

## Commands

- `mdless` - Interactive mode with command menu
- `mdless skills` - Install/manage Claude Code skills
- `mdless scan` - Find Claude workspaces on your computer
