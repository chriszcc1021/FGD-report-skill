# Project Instructions

Canonical Git repository:
https://github.com/chriszcc1021/FGD-report-skill

## Git Remote Rules

- Treat the canonical repository above as the source of truth for pull, push, and PR work.
- Before any push or PR, confirm `git remote -v` points to the canonical repository above.
- Do not create or change git remotes unless the user explicitly asks.
- If the local `origin` differs from the canonical repository, stop and ask before continuing.

## Collaboration Rule

- When the user shares a requirement, idea, product direction, or ambiguous task, first provide an implementation approach and success criteria, then wait for explicit confirmation before editing files or running build-changing commands.
- Proceed directly only when the user explicitly asks to implement, fix, start, make the change, run, commit, push, or similar.

## Coding Style

- When writing, reviewing, or refactoring code, apply the global `karpathy-guidelines` skill.
- Keep changes surgical, simple, and verifiable.
