# Watch composition study — throwaway

Question: how should placeholder media and the artist's personal invitation
share a section? Two compositions in the real `/temple-of-sound` page:

- `?variant=A#watch`: a photographic spread beside a continuous reading column.
- `?variant=B#watch`: a wide media stage, then parallel text fragments beneath it.

Both retain the three supplied fragments verbatim. The review bar toggles their
presence without committing to a text selection. Left/right keys switch studies;
H hides the bar. The notification button is a visual placeholder; it does not
enrol anyone in the existing general newsletter.

Run the normal preview on8791, then `npm run prototype:temple-watch`. Open
`http://localhost:8793/temple-of-sound?variant=A#watch` (`sand tunnel 8793`).
The Node proxy injects only this local experiment; no prototype code is included
by the normal website build. The upstream remains the accepted CMX page.
Original placeholder images live in `content/media/tos2.jpg` and `tos4.jpg`;
source copy lives in `content/pages/temple-of-sound/_watch.ts`. No crop or watermark
is written back to either image.

Phase: Expansion. Images are placeholders for future content, not symbols to
interpret. Layout, fragment selection, placement and signup remain unselected.
Watch is temporarily placed after Visit to compare the facts together. Neither
this placement nor these studies approve changing the poem or publishing Watch.
