# @mdless/cli

**Mind less, ship more.**

You know that feeling when you craft the perfect Claude Code skill, and then you need it in another project? Or when your teammate asks "how did you make Claude do that?"

Yeah, we're tired of that too.

## What's this?

mdless lets you share Claude Code skills across projects. Skills live in your repo, not on your machine—so your whole team gets the superpowers, not just you.

No more "it works on my Claude." No more copy-pasting skills between repos. No more explaining to Eddy how to set up his `.claude` folder for the fifth time.

## Usage

```bash
npm install -g @mdless/cli
mdless skills
```

Or just run it when you need it:

```bash
npx @mdless/cli skills
```

That's it. Pick the skills you want, hit enter, go back to shipping.

The CLI will:

1. Create `.claude/skills/` if it doesn't exist (you're welcome, Eddy)
2. Show you a list of available skills
3. Install the ones you pick (remove the ones you don't)

Commit the skills to your repo. Now everyone on your team has them. Revolutionary, we know.

## Available Skills

| Skill           | What it does                                      |
| --------------- | ------------------------------------------------- |
| **commit**      | Writes commit messages so you don't have to think |
| **pr**          | Creates PRs with actual descriptions              |
| **pr-comments** | Responds to PR comments (politely)                |
| **ci-errors**   | Reads CI logs and fixes the errors                |

## Why "mdless"?

Two reasons:

1. **md-less** — Write less markdown. Skills are maintained by the community, so you don't have to craft every SKILL.md from scratch.

2. **mindless** — Stop overthinking. Mind less and just ship that shit out.

## License

MIT — go wild.
