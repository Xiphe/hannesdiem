# Temple of Sound palette

`/temple-of-sound`; system theme. Source: `content/media/IMG_6257.JPG` + glimmers.

| Role                        | Light     | Dark      |
| --------------------------- | --------- | --------- |
| Background / canvas veil    | `#f7ecdf` | `#000000` |
| Foreground / fallback title | `#11120b` | `#d2d0c8` |
| Date / scroll indicator     | `#84442b` | `#343434` |
| Date shadow                 | `#f7ecdf` | `#030503` |
| Favicon: left top           | `#b46a49` | `#fff9df` |
| Favicon: left bottom        | `#84442b` | `#bdb49c` |
| Favicon: right top          | `#645b48` | `#f2ad78` |
| Favicon: right bottom       | `#11120b` | `#b46a49` |

Lettering edge overlay: `#ff8800`, 11%.

UI: `website/app/temple/style.css`, `scene.ts`, `forest.ts`.
Favicon: `website/app/temple/assets/mark.svg`; build: `website/build/assets.ts`; selection: `website/app/page.tsx`.

Palette changes: update UI, both favicon variants and this table together.

Working scene: restore system light/dark appearance for opener, poem colour clouds and refrain. Retain the artist’s pure-black dark ground. Native copy clouds use the corresponding foreground as their base. Startup remains black until assets and the first frame are ready. The original two favicon palettes remain unchanged.
