# Temple entry split — shared implementation contract

Approved 2026-11-05 in **Reshape Temple of Sound entry**. Local review only.

## Ownership

- Entry chat owns `PoemOpening` modes, poem/practical rendering, header, navigation
  progress, content section entrypoints and entry-memory/sidebar behavior.
- Feed chat owns the Watch preview band and `/temple-of-sound/watch/{slug}` viewer.
- Sharing chat owns share URLs/metadata/cards and legacy destination compatibility.
  Direct chat messaging is unavailable; inspect this file and the other chats.

## CMX seam

Entry will add optional `view: 'poem' | 'inside'` and `section` to `PoemOpening`.
Unspecified view preserves existing synthetic fixtures and published documents.
The root authored page explicitly selects poem mode. Four native CMX content files
(`visit.tsx`, `watch.tsx`, `create.tsx`, `share.tsx`) reuse its content function with
inside mode and a selected section; each renders the complete practical page.
This uses filesystem routing and avoids competing changes in `router.tsx`.
Feed can continue rendering the same Publication with its component environment.
There is no inside index or feed index.

## Destinations and memory

- Bare `/temple-of-sound` always shows the continuous poem, existing artwork intact.
- Enter links go to `/temple-of-sound/visit`, the first practical subsection.
- Practical sections: `/temple-of-sound/{visit,watch,create,share}`.
- Content: `/temple-of-sound/watch/{slug}`; poem: `?verse=…` (sharing owns lookup).
- `website/app/temple/entry-state.ts` exports `templeEntryStorageKey`
  (`hannesdiem.temple.entered`), `hasEnteredTemple()`, `rememberTempleEntry()` and
  `watchReturnHref()` (remembered -> Watch; otherwise poem). Storage value is `true`.
- Only practical-section arrivals/Enter count as entered. Feed deep links leave the
  state unchanged. Returning to the poem preserves the state.
- Sidebar keeps “Temple of Sound”; remembered visitors get Visit as its destination.
- Feed back: unentered -> poem; entered -> Watch centered on the current post.

## Rendering

Poem: opener, artist-supplied welcome with “Enter the Temple of Sound”, continuous
poem and closing “Enter”. Header background and menu logo fade over500ms in both
directions when the welcome action crosses its centered header position. Delay
hiding the header until its exit fade finishes. The welcome action disappears
immediately and its header replacement appears at full opacity, avoiding duplicate
button images. During exit, lower the bar beneath the poem's foreground stacking
layer so the returning invitation stays above it. It contains only “Enter the Temple of Sound” centered plus the
site-menu logo; no wordmark/date. The closing action fades in beneath
the held final phrase, centered in the space between its ink and the viewport
bottom. The artist defers button artwork to a separate exploration.

Inside: no opener or poem. Existing practical content order and full header appear
immediately. Wordmark links to the poem root. Progress/scrubbing follows practical
content only. Inspire/Be Held/Wish remain visible; activating them shows
“coming soon”. Header links have section paths as their native destinations;
enhancement can scroll between existing sections without reloading the document.
Above Visit, a native “Back to the Manifesto” link with a back arrow returns to
the poem with the artist's explanation below it. Compact spacing puts it just
above the normal arrival position, revealed by scrolling upward beyond the first
section, rather than another header item.
The return area's explanation is dimmed. Navigation progress starts at the
native Visit arrival and mobile scrubbing stays within the practical sections;
the return area is reached through ordinary upward scrolling.
Reuse the poem's three-depth fragment ground across Visit through Share, retaining
viewport-bounded rendering and motion fallbacks. Practical reading boundaries
contain the complete fitted contours; only the interleaved poem bounds them to
protect neighbouring verses. Feed rendering and static share-card patterns keep
their existing owners.

Validate with synthetic fixtures and keep website checks independent of content/.

The practical nav and wordmark/date ghost link use continuous pointer hit areas;
text and decorative canvases cannot intercept their actions. Mobile hit areas
include the nav's upper spacing. Decorative pieces remain inert and surrounding
native actions divide their gaps.

Use `npm run dev:preview` for local review with simulated Circle/signup/login.
The previous simulator survived only in `.generated/`; plain Wrangler instead
returned503 without runtime credentials. The tracked simulator uses in-memory
provider state and `/__preview/email`, needs no secrets and sends no email.
See `content/development/README.md` for restart and asset snapshot behavior.

## Integration status

Entry's rendering, routes and memory are implemented. `legacy-entry.ts` redirects
old practical hashes with notice parameters intact. Old recording hashes resolve
through Watch's published preview anchors, then open the canonical feed path;
the background HTML fetch leaves entry memory untouched. `section-navigation.ts`
handles the five agreed verse query identities after artwork layout settles.
Sharing still owns server-rendered verse metadata and new share controls/cards.

Concurrent Playwright runs collided through the shared asset build and the default
`test-results/` output. Use a task-specific `--output` directory and serialize asset
build/server startup for reliable combined checks. The entry chat owns the normal
8787 preview startup after its checks complete.

The entry-only staged snapshot builds and typechecks with `content/` absent.
All 39 selected browser checks (entry, memory, navigation, scrubber and opener)
and both entry-memory helper checks pass. The combined workspace also passed
the same 39 browser checks before the welcome-spacing refinement.

## Shared cursor investigation — 2026-11-05

**Resolved:** the artist identified an Ableton video overlay as the cause and
reports the cursor now works. No website fix or further cursor investigation is
needed. The following observations record the investigation history.

The artist still sees cursor changes in Chrome and Helium on macOS while moving
across the wordmark, main nav and other screen areas; also reported on feed
scrubbers. Entry owns this broader investigation. The feed chat previously
reproduced cursor changes only when a drag left the track and controls moved
during panel activation; its pointer capture and drag-cursor changes are retained.
Entry's full native-target sweeps remained stable. Fast headed Chromium and WebKit
checks also sampled actual X11 cursor images during six back-and-forth passes
over each wordmark, nav and playing synthetic video's slider:1080 samples per
surface/engine, with no intermediate cursor changes. These Linux results do not
reproduce or explain the reported Mac behavior. The artist's subsequent recording
shows a speaker-shaped cursor and an arrow while the link/wordmark remains
highlighted. No hidden player exists on the practical page and the site requests
no custom cursor image. The preview-only `/__preview/cursor` now isolates plain
native controls from all Temple scripts, media and animation for comparison on
the affected Mac. No additional cursor CSS workaround has been added. See
`docs/agents/temple-cursor-investigation.md` for evidence and next probes. Direct
chat messaging is unavailable; these notes and read-only video-chat inspection
carry the shared findings.

The artist confirms the same flicker on the static native-control page, without
Temple scripts, media or artwork. Stop treating it as a Temple hit-area defect;
the subsequent Safari comparison also showed odd behavior. The artist then
identified the Ableton overlay, resolving the investigation.

The artist tunnels port 8787 directly, with no alias. Use
`http://localhost:8787/temple-of-sound` and `sand tunnel 8787` in review handoffs.

## Watch overview labels — 2026-11-05

The artist asks to omit the Temple name from Watch's content overview cards.
Entry adds optional `previewImage` to post/video props and generates a
wordmark-free variant through the existing card renderer's `showWordmark: false`.
`shareImage` and external sharing keep their selected branding. `TemplePosts`
consumes `previewImage`; earlier Publications fall back to cover plus native
post title. This touches only the preparation post branch, not the sharing chat's
page/verse metadata or pattern work. Shared background bytes are reused across
the two variants to avoid duplicate poster requests. Direct thread messaging is
unavailable; preserve this distinction when continuing sharing/feed changes.
