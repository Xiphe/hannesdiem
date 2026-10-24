# hannesdiem.de

## CMX

This project exists to battle-test CMX. Use CMX primitives wherever possible. Treat custom glue as a potential CMX gap: investigate available primitives and surface the gap before introducing a workaround.

## Tests

Use synthetic fixtures for all test assertions. Never assert against authored production content or use its generated Publications and media as fixtures. Keep website builds and checks runnable with `content/` absent to simulate the future repository split.

## Prose

Never invent prose for the user unless explicitly instructed. Preserve supplied wording and order; edit only as requested, including spelling corrections when authorized.

## Agent skills

- Remix work: read `.agents/skills/remix/SKILL.md`; use installed docs via `node_modules/remix/INDEX.md`.
- Tickets: GitHub Issues via `gh`; PRs are not a request surface.
- Triage: independent label groups; skill overrides in `docs/agents/triage-labels.md`.
- Domain: before exploration, read `GLOSSARY.md` and relevant `docs/adr/*.md`.
- Temple of Sound design: read `website/app/temple/docs/collaboration.md` before proposing or implementing artwork changes.
