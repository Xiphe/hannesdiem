# Local preview

Run `npm run dev:preview` for the website with simulated Watch signup, login and
Circle actions on port 8787. Use synthetic names and email addresses. Provider
requests are intercepted in memory; the preview uses no runtime credentials and
sends no email. Open `/__preview/email` to follow the latest confirmation link.

Use `sand tunnel 8787` to review from another computer. Set `PREVIEW_PORT` to use
a different port.

The preview snapshots built assets so concurrent builds cannot remove files from
an active review. After changing code or content, stop and restart
`npm run dev:preview`. If a coordinated build is already complete, run
`node content/development/preview.mjs` to start without rebuilding. Simulated
contacts, email and Circle reservations reset when the process restarts.

The simulated preview copies prepared media from `.generated/media` directly into
its snapshot, including after asset-only builds replace `dist/`. Plain Wrangler
still needs `node content/development/media.ts` after an asset-only build.

`npm run dev` remains the live-reloading Wrangler server. Its unconfigured local
runtime does not enable signup/login/Circle flows; use the simulated preview to
review those flows.
