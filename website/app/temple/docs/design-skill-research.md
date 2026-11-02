# Skills for collaborative creative exploration

Research: 2026-10-24. Reviewed actual upstream instructions. Primary question: can a reusable skill preserve **Expansion → an agreed transition → Convergence**, while treating a scoped Yes independently from a whole-direction decision?

## Finding

**BMad brainstorming is the closest existing foundation.** It explicitly keeps expansive generation and convergence separate, defers narrowing to the user's readiness/request, and preserves session memory. Earlier candidates alone were weaker. A new process need not invent the underlying method.

No inspected skill covers the full requested interaction contract unchanged: grounded visual alternatives **or meaningful live controls**; interview for missing expressive direction; broaden on rejection; preserve local Yes without silently closing the wider field; jointly identify convergence; restore those states in fresh sessions. This is a bounded finding, not a claim that no such skill exists anywhere.

**Decision, updated 2026-10-25:** the artist approved a concise role and adaptive workflow after an interview about artistic uncertainty, then named it `explore`. Published in [Xiphe/skills](https://github.com/Xiphe/skills/blob/main/skills/explore/SKILL.md), commit `353f0ae`. Installed at `/home/agent/.codex/skills/explore`. The earlier site-local process and its separate phase manuals are superseded. Artwork remains in Expansion; this approval applies to the skill, not the open scene.

**Earlier draft evaluation:** a fresh agent enacted seven independent scenarios: rejected concept, scoped typeface Yes, tentative praise, explicit combination request, exact approved color change, fresh-session recovery, and timing refinement inside an accepted scene. Responses preserved the affected scopes, kept unresolved directions open, and executed explicit convergence/implementation requests without repeated approval. This evaluated that earlier draft, not the subsequently rewritten skill. The approved `explore` version passes bundled skill validation, formatting and local reference checks; no aesthetic-quality claim follows.

## Adoption signals

Snapshot from `npx skills find` and GitHub's repository API, 2026-10-24. Catalog installs measure adoption; repository stars apply to the whole repository. Neither establishes the quality of the particular interaction workflow. No reliable comparative user-rating evidence was established.

| Skill                            | Reported installs | Repository stars | Source                                                                                                                                                        |
| -------------------------------- | ----------------: | ---------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BMad `bmad-brainstorming`        |            ~11.7K |           54,510 | [catalog](https://skills.sh/bmad-code-org/bmad-method/bmad-brainstorming), [repository API](https://api.github.com/repos/bmad-code-org/BMAD-METHOD)           |
| obra `brainstorming`             |             ~404K |          304,596 | [catalog](https://skills.sh/obra/superpowers/brainstorming), [repository API](https://api.github.com/repos/obra/superpowers)                                  |
| Anthropic `playground`           |               ~8K |           44,331 | [catalog](https://skills.sh/anthropics/claude-plugins-official/playground), [repository API](https://api.github.com/repos/anthropics/claude-plugins-official) |
| gstack `design-shotgun`          |               383 |          137,511 | [catalog](https://skills.sh/garrytan/gstack/design-shotgun), [repository API](https://api.github.com/repos/garrytan/gstack)                                   |
| 0xdesign `design-lab`            |   not established |              781 | [repository API](https://api.github.com/repos/0xdesign/design-plugin)                                                                                         |
| AsimSayed `diverge` / `converge` |   not established |                0 | [repository API](https://api.github.com/repos/AsimSayed/claude-skills)                                                                                        |

The Asim pair is useful prior art for named modes, not a widely adopted recommendation. Catalog deprecation claims about Design Lab were inconsistent with the inspected source; migration status is unestablished.

## Strongest sources / concrete fit

### BMad Brainstorming — closest existing workflow

[SKILL.md](https://github.com/bmad-code-org/BMAD-METHOD/blob/61e01f82644c4bb533750cfa0d6d61ab61d2cc9b/skills/bmad-brainstorming/SKILL.md), [converge](https://github.com/bmad-code-org/BMAD-METHOD/blob/61e01f82644c4bb533750cfa0d6d61ab61d2cc9b/skills/bmad-brainstorming/references/converge.md), [resume](https://github.com/bmad-code-org/BMAD-METHOD/blob/61e01f82644c4bb533750cfa0d6d61ab61d2cc9b/skills/bmad-brainstorming/references/resume.md).

- **Framing** resists premature conclusion; session memlog records ideas, decisions and authorship. Creative Partner participates with the user; Facilitator and autonomous stances also exist.
- **Converging** explicitly separates the phases, waits for readiness/request, and prevents convergence leaking into generation. The convergence reference restores the whole field, including buried ideas, before narrowing.
- **On Activation / Resuming** rely on BMad scripts/config and the full memlog. This is a framework setup, not an instructions-only drop-in. Persisted `mode` denotes stance, not the explicit Expansion/Convergence phase we need.
- Needed adaptations: scoped element Yes versus global readiness; shared phase keywords/turning point; live visual alternatives/controls. Replace the 100+ ideas target and user-majority dialogue defaults where they conflict with this artist's requested collaboration. Customization hooks exist, but their adequacy for every change was not executed/tested.

### Anthropic Playground — strongest controls building block

[SKILL.md](https://github.com/anthropics/claude-plugins-official/blob/58267944f92187b7d6a1c822165c96c81c864806/plugins/playground/skills/playground/SKILL.md), [design template](https://github.com/anthropics/claude-plugins-official/blob/58267944f92187b7d6a1c822165c96c81c864806/plugins/playground/skills/playground/templates/design-playground.md).

**Core requirements**: immediate preview, controls, coherent presets, exportable state/prompt. **Common mistakes**: too many controls, nonresponsive preview, unusable defaults. It provides the manipulable artifact, not intent discovery or an approval/mode protocol. A toggle between one arbitrary concept and its baseline does not expose a meaningful creative space.

### gstack Design Shotgun — strongest integrated visual comparison

[SKILL.md](https://github.com/garrytan/gstack/blob/00100f1598dcfc192f0f0f2d3345b6825737932a/design-shotgun/SKILL.md).

**Steps 1–3a** gather project/taste context and demand distinct concepts; **Step 4** compares, remixes and regenerates; **Step 6** saves an approved direction across sessions. It requires gstack tooling and image generation. Discovery is capped at two rounds before assumptions, and a preferred variant becomes a locked direction. No independently negotiated overall phase transition or live parameter playground. Repo popularity substantially exceeds this individual skill's reported installs.

### Other inspected candidates

- [obra Brainstorming](https://github.com/obra/superpowers/blob/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills/brainstorming/SKILL.md): **Look Before You Ask / Play It Back / Red Flags** preserve context, user intent and scope of approval. Its outcome is an approved design doc and implementation planning, not persistent visual expansion with per-element anchors.
- [Asim Diverge](https://github.com/AsimSayed/claude-skills/blob/d408c24bb7b081357b828b5031a891870a9b692e/skills/diverge/SKILL.md), [Converge](https://github.com/AsimSayed/claude-skills/blob/d408c24bb7b081357b828b5031a891870a9b692e/skills/converge/SKILL.md): explicit expansive versus surgical modes; selection automatically hands off, without scoped/global approval or durable state. Product/icon prescriptions are unrelated to a general artist process.
- [Design Lab](https://github.com/0xdesign/design-plugin/blob/913a7ab2ac7e0f48eab77c93f2f5376150864b02/design-and-refine/skills/design-lab/SKILL.md): **Phases 0–5** interview, compare and collect element feedback; **Phase 6** automatically synthesizes liked parts; **Phase 7** confirms a final design. Useful machinery, premature synthesis risk.
- [OpenAI ideate](https://github.com/openai/plugins/blob/0722921d5542fc593105c27bd52630babd8b8c2a/plugins/product-design/skills/ideate/SKILL.md), [get-context](https://github.com/openai/plugins/blob/0722921d5542fc593105c27bd52630babd8b8c2a/plugins/product-design/skills/get-context/SKILL.md): actual context, independent image options and feedback loop. Image-first; selection becomes a build target. No explicit overall phase gate or live artwork controls.
- [Addy Osmani idea-refine](https://github.com/addyosmani/agent-skills/blob/aeac41d4d005999432bb7312f7ff06383a91d59d/skills/idea-refine/SKILL.md): its phase transition follows reactions/resonance/pushback, so it does not establish the requested shared turning point. Search catalog reports ~58.2K installs; adoption alone does not resolve the conflict.
- [Lyndon brainstorm-diverge-converge](https://github.com/lyndonkl/claude/blob/4acc337d4dbdb19da6469eb2504c16669c1cafa1/skills/brainstorm-diverge-converge/SKILL.md): sequential generation, clustering and ranking; naming both phases alone does not establish a shared transition. Catalog reports ~148 installs.
- [Sumi design-process-methods](https://github.com/phazurlabs/sumi/blob/3a3693b02c0968ef2d299044119faef8f3a24624/skills/design-process-methods/SKILL.md): establishes breadth before commitment, but teaches methodology rather than enforcing an artist's operational approval contract.
- [Anthropic frontend-design](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design/SKILL.md): supports subject-specific craft and critique, not a persistent collaborative exploration protocol. Already available locally; installing it again would not address the missing behavior.

## Established method / shared language

The [Design Council's Double Diamond](https://www.designcouncil.org.uk/resources/framework-for-innovation/) explicitly alternates divergent exploration and convergent action, involves the people affected and tests multiple answers. It is non-linear/revisitable. The exact approval semantics below come from **this user's instructions**, not from the Council or the inspected skills:

The approved `explore` skill owns the collaboration guidance; Temple's current state lives in [collaboration.md](collaboration.md).
