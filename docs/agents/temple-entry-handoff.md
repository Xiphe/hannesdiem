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

Poem: opener, welcome placeholder (artist will author copy) with Enter, continuous
poem, closing “Enter the Temple”. Header appears on opener exit and contains only
“enter the temple of sound” centered plus the site-menu logo; no wordmark/date.

Inside: no opener or poem. Existing practical content order and full header appear
immediately. Wordmark links to the poem root. Progress/scrubbing follows practical
content only. Inspire/Be Held/Wish remain visible; activating them shows
“coming soon”. Header links have section paths as their native destinations;
enhancement can scroll between existing sections without reloading the document.

Validate with synthetic fixtures and keep website checks independent of content/.

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
