# @mdless/cli

![mdless cli screenshot](https://raw.githubusercontent.com/mdless/mdless-cli/main/assets/screenshot.png)

**Mind less, ship more.**

Run custom Claude Code agent loops from markdown prompts in your repo.

## 📦 Installation

#### Run instantly with npx

```bash
npx @mdless/cli
```

#### Install globally with npm

```bash
npm install -g @mdless/cli
```

## 📋 Key Features

#### Set up agent prompts

```bash
mdless init
```

Copies default prompts into `.mdless/agents/`. Edit them to match your project.

#### Run agents in tmux

```bash
mdless work
```

Launches every prompt in `.mdless/agents/` as a looping agent in a tmux session.

#### Run a single agent

```bash
mdless agent <name>
```

Runs one agent on repeat using `.mdless/agents/<name>.md`.

## 📄 License

MIT — go wild.
