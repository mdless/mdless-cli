# @mdless/cli

![mdless cli screenshot](https://raw.githubusercontent.com/mdless/mdless-cli/main/assets/screenshot.png)

**Mind less, ship more.**

Run custom Claude Code agent loops from plain markdown prompts in your repo.

## 📦 Installation

#### Run instantly with npx

```bash
npx @mdless/cli
```

#### Install globally with npm

```bash
npm install -g @mdless/cli
```

## 🧠 The idea

An **agent is just a markdown file**. Drop your prompts into `.mdless/agents/` and
each file becomes a Claude Code agent you can run once or on a loop.

```
.mdless/
├── agents/
│   └── orchestrator.md   →  agent "orchestrator"
└── learnings/
    └── connect-to-sentry.md   →  persisted know-how
```

- One markdown file = one agent.
- The **file name is the agent name** (`orchestrator.md` → `orchestrator`).
- The file contents are the agent's prompt — write whatever instructions you want.

### Learnings

Every agent automatically reads `.mdless/learnings/` at the start of each session
and is prompted to save new findings there before finishing. This lets the agent
accumulate codebase-specific knowledge across sessions — workarounds, environment
quirks, scripts that work around broken MCP servers, and anything else it discovers.

Create a learning manually or let the agent write its own:

```
.mdless/learnings/connect-to-sentry.md
.mdless/learnings/run-migrations.md
```

Get started with the bundled default:

```bash
mdless init
```

This copies the default `orchestrator` prompt into `.mdless/agents/` — a single
coordinator that drains a GitHub-backed pipeline (file issues, implement, review,
fix, remediate) by spawning ephemeral workers. Edit it, rename it, or add your
own files — anything in that folder counts as an agent.

## 🚀 Running agents

#### Run an agent once

```bash
mdless agent <name>
```

Runs the agent in `.mdless/agents/<name>.md` a single time. For example,
`mdless agent reviewer` runs `.mdless/agents/reviewer.md` once and exits.

#### Run an agent on a loop

```bash
mdless agent <name> --loop
```

Runs the agent on repeat: it executes Claude Code, waits, then runs again,
indefinitely. Stop with `Ctrl-C`.

Pass a count to cap the number of runs:

```bash
mdless agent <name> --loop 2   # run twice, then exit
```

Logs are written to `.mdless/logs/<name>.log`.

## 📋 Command reference

| Command                        | What it does                                            |
| ------------------------------ | ------------------------------------------------------- |
| `mdless`                       | Interactive menu                                        |
| `mdless init`                  | Copy the default agent prompts into `.mdless/agents/`   |
| `mdless agent <name>`          | Run a single agent once from `.mdless/agents/<name>.md` |
| `mdless agent <name> --loop`   | Run the agent on repeat, forever                        |
| `mdless agent <name> --loop <n>` | Run the agent `<n>` times, then exit                  |

## 📄 License

MIT — go wild.
