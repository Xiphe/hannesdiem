# Temple cursor investigation — 2026-11-05

The artist reports cursor flicker in Chrome and Helium on their Mac, both over
ordinary Temple navigation and the feed scrubber. The supplied recording shows a
speaker-shaped glyph over highlighted navigation, and an arrow over the still
highlighted wordmark. The visible hover treatment remains stable while the cursor
shape changes. This establishes a discrepancy between the visible cursor and
hover feedback; it does not establish a macOS root cause.

Recording: `/home/agent/.codex/attachments/a403863b-4f8c-4295-b593-4c43284e37bb/Screen Recording 2026-11-05 at 16.25.33.mov`.
Extracted views: `/tmp/temple-cursor-recording/overview.png` and
`/tmp/temple-cursor-recording/cursor-3.png`.

## Source evidence

- [CSS cursor specification](https://www.w3.org/TR/css-ui-4/#cursor): the predefined
  cursor set has no speaker or media cursor. Cursor choice normally follows the
  hit target, although browsers may override it for native controls and browser
  interface states.
- [Current Chromium macOS cursor implementation](https://raw.githubusercontent.com/chromium/chromium/main/ui/base/cocoa/cursor_utils.mm):
  `GetNativeCursor` maps the hand type to `NSCursor.pointingHandCursor` and the
  ordinary pointer type to `NSCursor.arrowCursor`. Its switch has no speaker or
  media cursor type. Custom image cursors use a separate path.
- [Apple NSCursor reference](https://developer.apple.com/documentation/appkit/nscursor):
  the documented system cursor set includes arrow, pointing hand, resize and drag
  cursors, with no documented speaker cursor.

These sources do not identify the recorded glyph's origin. In particular, its
appearance alone does not prove that a media player supplied it.

## Project and live DOM evidence

Repository inspection found no cursor image URLs, script-written cursor images or
pointer-lock calls. Header controls request `pointer`; compact navigation uses
`grabbing` during a drag. The feed uses resize cursors for its ranges.

Watch now renders cover links and images through `TemplePosts`, without hidden
players. Feed Back uses native document navigation, so feed controls cannot remain
as DOM overlays on the practical page after that navigation.

A direct Chromium DOM probe of `/temple-of-sound/visit` at 2158px width returned:

| Probe                                                    | Result    |
| -------------------------------------------------------- | --------- |
| `video`, `audio`, `iframe` element counts                | 0, 0, 0   |
| Wordmark and Visit/Watch/Create/Share center hit targets | `A`       |
| Computed cursor on those hit targets                     | `pointer` |
| Page errors                                              | None      |

That preview had entered artwork fallback because its media snapshot was missing;
the DOM probe still establishes the absence of a media overlay. It does not
reproduce or verify the native Mac cursor. Linux headless CSS/hit-target checks
cannot validate the Mac cursor's displayed pixels.

## Plain-control result

The preview-only `/__preview/cursor` page contains plain HTML controls without
JavaScript, media, canvas or application CSS. The artist confirms the same flicker
there in the affected browser. Temple's active media, canvas painting and header
hit areas are therefore not required for the observed symptom. This does not
identify whether Chromium, macOS, an extension or another cursor utility owns the
incorrect state. Do not add further Temple cursor overrides to address it.

The artist uses direct port 8787 forwarding, with no 18787 alias. Review URL:
`http://localhost:8787/__preview/cursor`; tunnel command: `sand tunnel 8787`.

## Next discriminator

Compare that same page in Safari on the affected Mac. If Safari remains stable,
investigate Chromium-specific cursor state and browser profiles/extensions next.
If Safari also flickers, investigate system cursor state or cursor utilities.
That comparison has been requested and is pending.

[Chromium issue 40925746](https://issues.chromium.org/issues/40925746) documents
macOS cursor failures after Accessibility pointer-size changes, with low-level
cursor caching suspected and a 2026 reproduction noted. This is related evidence,
not an identification of the artist's defect. Apple documents the size, colour
and shake-to-locate settings in its
[pointer settings guide](https://support.apple.com/guide/mac-help/make-the-pointer-easier-to-see-mchlp2920/mac).
