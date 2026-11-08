# hannesdiem.de

## Shared workspace

We work together with multiple agents in the same directory (`/workspace/hannesdiem`) and share the webserver on port `8787`.

When work reaches exploratory or competing states, raise this with the user before building ways to show competing states in the same worktree or proactively branching.

When starting in a folder other than `/workspace/hannesdiem`, inform the user and assume you are working in a branch.

## Cloudflare access

Use the `gopass` skill with `projects/sites/cloudflare/admin/{api-token,account-id}`.
Stream uploads and playback origins: `docs/agents/video.md`.
New or replacement recordings: follow its cover-selection workflow and proactively
ask the artist to choose a cover before declaring the content ready.

## CMX

This project exists to battle-test CMX. Use CMX primitives wherever possible. Treat custom glue as a potential CMX gap: investigate available primitives and surface the gap before introducing a workaround.

## Tests

Use synthetic fixtures for all test assertions. Never assert against authored production content or use its generated Publications and media as fixtures. Keep website builds and checks runnable with `content/` absent to simulate the future repository split.

Operational QA may check a running site's health, UI behavior, and the dedicated test user's login. Keep content regression assertions synthetic. `npm run check:website` is the fast deployment gate. Node tests requiring browsers, runtimes, or long simulations use `.slow.test.ts`; browser suites run separately.

## Prose

Never invent prose for the user unless explicitly instructed. Preserve supplied wording and order; edit only as requested, including spelling corrections when authorized.

## Links

All external links open in a new tab.

## Agent skills

- Deploy or take over deployment QA: read `.agents/skills/deploy/SKILL.md`; use the terse, gitignored `.deploy-qa.json` for routine coordination. Direct chat is reserved for unresolved blockers or ownership conflicts.
- Remix work: read `.agents/skills/remix/SKILL.md`; use installed docs via `node_modules/remix/INDEX.md`.
- Tickets: GitHub Issues via `gh`; PRs are not a request surface.
- Triage: independent label groups; skill overrides in `docs/agents/triage-labels.md`.
- Domain: before exploration, read `GLOSSARY.md` and relevant `docs/adr/*.md`.
- Artistic work without a clear specification: use the installed `$explore` skill from `Xiphe/skills`.
- Temple of Sound design: read `website/app/temple/docs/collaboration.md` before proposing or implementing artwork changes.
