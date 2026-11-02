# Watch and Create studies — throwaway

The artist selected Alongside: a photographic spread beside a continuous reading
column. The original two-way comparison is recoverable at `7212ac6` on this branch.
Develop this composition in the real `/temple-of-sound` page, after the complete
first verse/refrain pair. A cloned Visit material sits behind the text; images
arrive higher and the centred CTA follows both columns. Visit receives a heading
above its map. Preserve the second verse's original typography across the inserted
section and leave more space before it.

The artist's two revised paragraphs remain verbatim and visible, with their
restored introduction beneath “Watch”. The artist requested
removal of the review bar, fragment toggles and keyboard shortcut. The notification
button is a visual placeholder; it does not enrol anyone in the general newsletter.
The artist supplied its context: “I'll drop new content here regularly”.

Run the normal preview on8791, then `npm run prototype:temple-watch`. Open
`http://localhost:8793/temple-of-sound?variant=A#watch` (`sand tunnel 8793`).
The Node proxy injects only this local experiment; no prototype code is included
by the normal website build. The upstream remains the accepted CMX page.
The clean, full-resolution originals replace the watermarked placeholders:
`A7403062-1.jpg` → `content/media/tos4.jpg`, `A7404065-1.jpg` →
`content/media/tos2.jpg`, and `A7403058-1.jpg` → `content/media/tos.jpg`.
The existing filenames preserve the Watch/Create references and layouts.
Source copy lives in `content/pages/temple-of-sound/_watch.ts`.

Images are placeholders for future content, not symbols to interpret. Alongside
and placement after the first pair are artist choices; fragment inclusion and
signup remain open. The artist restored “Watch” after a headline-free trial;
the first paragraph retains its slightly heavier weight. They describe intimate
access to an existing creative process, laid-back and humble, without overselling it.
Assistant-written headline candidates were rejected; use the making-art skill
to moderate their own wording. No publication approval.

The Watch material now fits the reading column inside a clipped background-only
layer; it cannot paint over either neighbouring verse. Desktop images stretch
upward from the text's bottom baseline without determining the row height. The
centred action sits closer beneath both columns. On desktop, Visit's heading ends
at the map's right contour, alongside the room image; mobile keeps it left-aligned.

After the artist found the bounded piece too small, fit its largest clear interior
rectangle around the padded text rather than fitting its outer bounds. All text
stays inside the concave contour; the background-only clip still protects the
verses. Add80–160px of responsive top margin to separate Watch from the poem.

The artist then requested a less geometric form with rounder corners. The current
trial uses gently bowed sides and a shallow inward upper curve, with rounded
geometry instead of relying on the inherited outline stroke. The existing
interior fitting and background boundary still apply; Visit's shape is unchanged.

## Create — initial material in context

`http://localhost:8793/temple-of-sound?variant=A#create` shows the artist's third
fact. Source copy, including the tooltip note, lives verbatim in unpublished
`content/pages/temple-of-sound/_create.ts`. The requested `tos.jpg` and exact
`mixing-scene-one-week-retreat-1803-2fadbcefea805a0a.webp` are in `content/media/`.

Working choices for review: place Create after the second verse/refrain pair,
reuse the current text material and typography, and overlap the mixing image on
the portrait while retaining its gesture. The earlier “let's talk” action opens
the supplied sound@hannesdiem.de address. No new prose or publication approval.

“steal*” opens the supplied italic note on hover, keyboard focus or tap; Escape,
blur and outside taps dismiss it. The native popover escapes the material clip.
The Create navigation item reaches the section. The material fitting is shared
in `reading-material.js`, with independent gradient IDs, so
adding the new fact preserves Watch's contour and placement.

Artist refinement: Create has a distinct rounded contour with a right-side inward
bend and sloping lower edge. “Collaborate on music” is the supplied main heading.
Following the artist's screenshot correction, the mixer overlaps only the lower
portrait, leaving the face and hands visible. The artist then removed the separate
Create label and requested staggered lower image edges. The mixer extends24–64px
below the portrait, with clearance before the reading column on mobile and before
the contact action on desktop. Watch's contour remains independent.

The tooltip uses a softly rounded, irregular SVG piece with a theme-aware neutral
gradient instead of a bordered panel. Its native popover still supports hover,
keyboard focus, tap, Escape and outside dismissal, with viewport-aware placement.
The artist's CTA now reads “what should we write together?” above “lets talk”.
