# Piece tooltip

The artist-approved irregular tooltip material, saved for reuse independently of
the Create prototype. It has no authored page copy or active page placement.

Import `PieceTooltip` from `view.tsx` inside a hydrated Remix component and include
`piece-tooltip/style.css` in that feature's stylesheet:

```tsx
<PieceTooltip
  id="unique-note-id"
  label={label}
  content={explanation}
/>
```

The caller supplies a document-unique `id`, the trigger `label` and plain-text
`content`. The explanation retains the accepted italic treatment. The SVG gradient
is namespaced by that ID; inline span markup allows placement within prose.

The native popover supports mouse hover, keyboard focus and click/tap pinning.
Escape, blur and outside clicks dismiss it. Placement prefers bottom centre,
clamps within the viewport and flips above when needed. Its integrated pointer
continues to target the trigger after clamping. Scroll updates placement; resize
closes it. Remix's task AbortSignal removes listeners, cancels pending dismissal
and closes the popover on disposal.

Run the standalone synthetic browser check without a website or content build:

```sh
node --import remix/node-tsx --test website/tests/piece-tooltip.slow.test.ts
```
