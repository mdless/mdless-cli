# @mdless/cli

**Mind less, ship more.**

You know that feeling when you craft the perfect Claude Code skill, and then you need it in another project? Or when your teammate asks "how did you make Claude do that?"

Yeah, we're tired of that too.

## 🤔 Why "mdless"?

Two reasons:

1. Write less markdown. Skills are maintained by the community, so you don't have to craft every SKILL.md from scratch.

2. Mind less - stop overthinking - and just ship that shit out.

Mdless lets you share your superpowers across projects and teams. Skills live in your repo, not on your machine—so your whole team gets to be a superhero.

No more "it works on my Claude." No more copy-pasting skills between repos. No more explaining to Eddy how to set up his `.claude` folder for the fifth time.

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

#### Share skills across projects

```bash
mdless skills
```

| Skill                                          | What it does                                      |
| ---------------------------------------------- | ------------------------------------------------- |
| [**commit**](skills/commit/SKILL.md)           | Writes commit messages so you don't have to think |
| [**pr**](skills/pr/SKILL.md)                   | Creates PRs with actual descriptions              |
| [**pr-comments**](skills/pr-comments/SKILL.md) | Responds to PR comments (politely)                |
| [**ci-errors**](skills/ci-errors/SKILL.md)     | Reads CI logs and fixes the errors                |

That's it. Pick the skills you want, hit enter, go back to shipping.

The CLI will:

1. Create `.claude/skills/` if it doesn't exist (you're welcome, Eddy)
2. Show you a list of available skills
3. Install the ones you pick (remove the ones you don't)

Commit the skills to your repo. Now everyone on your team has them. Revolutionary, we know.

## 📄 License

MIT — go wild.
