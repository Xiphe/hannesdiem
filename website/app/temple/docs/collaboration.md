# Temple of Sound: client–artist collaboration

Research: 2026-10-22. Small collaborative steps accepted; opener prototype explicitly accepted on 2026-10-23.

## Current exploration rule

The artist explicitly accepted the completed opener: “lass uns das bitte als opener scene festhalten. Prototype akzeptiert”. The accepted checkpoint is `76e9ca7`, default impressions treatment. The artist subsequently requested integration into the regular `/temple-of-sound` page. **Only the opener is approved for publication.** The poem and practicalities remain unpublished drafts until explicitly approved. Preserve the opener’s appearance and behaviour; new poem artwork remains separate work. For future unresolved design questions, continue exploring until the artist explicitly approves. Positive feedback guides further options; it is not a shortlist, commitment or permission to refine a winner. For lettering, present existing, unmodified typefaces with unexpected, edgy character. Custom-font creation and glyph modification are outside the request.

## Accepted opener / recovery

- Accepted prototype: `76e9ca7`; earlier A–L experiments and original prose: `codex/temple-exploration-archive` at `0b58f9e`. Use git history for discarded specimens, controls and standalone preview server.
- Runtime: `/temple-of-sound`, regular CMX publication and Remix shell; public CMX page contains only the opener. `content/pages/temple-of-sound/_draft.tsx` preserves the full prose and verse/refrain pairs verbatim, excluded from page discovery. `website/app/temple/` owns the opener island. No OWA chrome.
- Accepted direction: D's live-scene typography mask + A's forest/glimmers. Vulnerability, connection, brave opening, rising energy; rough/gritty, glitches without an overly technical aesthetic. Sources: [creative compass](https://github.com/Xiphe/hannesdiem/issues/2), [visitor control](https://github.com/Xiphe/hannesdiem/issues/3), [audio](https://github.com/Xiphe/hannesdiem/issues/5), [opening exploration](https://github.com/Xiphe/hannesdiem/issues/6).
- Lettering: Bricolage with shallow optical pair/line overlaps and viewport-edge contact; Germania One with strikethrough; Cinzel Decorative Bold `TEMpLe of SOuNd`, half visible of–SOuNd gap; Unbounded. Landscape alignment: TEMPLE.right = OF.right; OF.left = SOUND.left. On 2026-10-24 the artist approved the larger centred study (`ca5da9c`) for portrait viewports: centre all three lines independently; size against the longest word with the same height cap. Use `(orientation: portrait)`, including live orientation changes; no width breakpoint. Four native faces, no custom glyphs or fixed letter slots. [Glitch research](typographic-glitch.md).
- Interaction: coherent faces dominate; scroll changes whole words with uneven per-visit ordering/timing, past/future fragments and brief whole-word flashes. Mouse disturbs local characters, then resolves; idle gaps ~0.95–2.3s. The four faces precede upward exit and background reveal; no zoom. Whole scene: 0.3 viewports of scroll, 130svh section. Glimmers fade against rectangular viewport edges. Artist selected `#ff8800` at 11%, edge-only and clipped to lettering; no global gold wash.
- Appearance: system theme; [palette + page-specific favicon](palette.md).
- Date: November 1 – December 20, 2026, dark `#343434` / light `#84442b`, balanced top inset, 28ms flickers; exits with title. Heroicons 2.2.0 `16/solid/arrow-down` uses the date colour and fades over the first 36px of scroll (less on small viewports). No review controls.
- Assets: original IMG_6257.JPG, sunlight x53.24%/y54.07%, existing LFS → immutable R2 pipeline. The 1920px variant is byte-identical to the accepted preview. Only four accepted fonts ship, through the hashed website build. No new dependencies.
- Island lifecycle: listeners/observers/RAF stop on task abort; offscreen/inactive-tab rendering pauses. Observe actual stage dimensions to avoid stale canvas sizes during viewport changes. Reduced motion freezes ambient animation and crossfades transitions.

## Evidence from this project

Whole-scene variants bundled typography, composition, imagery, motion and meaning. The artist could reject the bundle without having enough alternatives for any individual decision. Increasing the variant count repeated this problem. The artist wants smaller commitments and a creative role throughout. D’s masked typography and A’s forest/glimmers are promising evidence; neither is approval of a finished composition. Preserve the supplied prose and existing value/mood exploration.

## What the sources support

- **Small visual deliverables before compositions.** Samantha Warren involves stakeholders early through visual-language samples without a page layout. Style Tiles provide concrete typographic/interface samples that let a client discuss visual language without also accepting an entire composition. Detailed mockups can imply a completed design and disconnect clients from the process. [Warren, _Style Tiles and How They Work_](https://alistapart.com/article/style-tiles-and-how-they-work/).
- **Participation in making, not only evaluation.** IDEO.org’s co-creation method brings participants into the design team, making alongside designers rather than merely answering interview questions. Its original setting is community-centered service design; applying that relationship to an artist commissioning their own artwork is an adaptation. [IDEO.org, _Co-Creation Session_](https://www.designkit.org/methods/co-creation-session.html).
- **A critique needs an explicit scope and shared objectives.** Sarah Gibbons distinguishes exploratory critique from an approval review. Feedback should be a conversation about how the work meets its objectives, with clear boundaries for the current discussion. [NN/g, _Design Critiques_](https://www.nngroup.com/articles/design-critiques/).
- **Feedback must determine the next tangible iteration.** IDEO.org recommends documenting findings and needed changes, then building and testing again. Iteration refines an idea; the method does not demand a complete answer in the first prototype. [IDEO.org, _Integrate Feedback and Iterate_](https://www.designkit.org/methods/integrate-feedback-and-iterate.html).
- **Show what the feedback changed.** Rachel Krause recommends a short immediate recap, followed by visible changes connected to the feedback that caused them. Also acknowledge suggestions that were deferred or not acted on, with reasons. [NN/g, _Closing the Loop_](https://www.nngroup.com/articles/after-design-critique/).

## Proposed application here

This loop is our synthesis; the sources do not prescribe its exact sequence, a magic option count or universal artistic approval rules.

1. **Agree the next decision.** Name one manageable question and why it matters to the artist’s stated intent. The artist can change the question before work starts. No new emotional brief or compulsory questionnaire.
2. **Choose the smallest useful comparison.** Typography can begin with the actual title in several contrasting treatments; motion needs a browser fragment. Supply enough genuinely different alternatives to reveal preferences within that question. Keep already-favored material available as context. Related variables may move together when separating them would make the comparison misleading.
3. **Create together.** Invite the artist to select, combine, annotate, supply references, redirect or reject all options before polishing. Ask about the specific mismatch when intent is unclear. Do not independently assign symbolic meanings to forms.
4. **Make the chosen experiment.** Implement only the agreed scope. Inspect it in context so local improvements do not quietly damage the whole. A promising fragment is permission to explore that fragment, not approval of neighboring choices.
5. **Record the decision and stop at that boundary.** Save the artifact and a short record: question; artist’s choice and reason in their words; accepted scope; unresolved concerns; next question. Distinguish **exploring**, **accepted for now**, and **rejected**. Accepted choices are revisitable when later evidence conflicts; explain the reason before reopening them. Commit accepted work in small units, leaving alternatives recoverable.

The artist directs and owns the expression. The agent prepares legible alternatives, reveals assumptions and executes agreed experiments. Artistic decisions and technical execution are separate responsibilities; routine technical work need not become another approval ceremony.
