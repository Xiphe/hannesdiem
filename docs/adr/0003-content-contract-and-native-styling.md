# Keep presentation in Remix implementations

Migrate the matching Next.js source and DB export with visual/layout parity. CMX documents use reusable content components and ordinary rich-text HTML; Remix implementations own layout, responsive behavior, and native `css`/`mix` styles. Default to presentation-free content; intentional one-offs are allowed. Avoid Tailwind and additional UI/CSS dependencies.

Preserve working navigation, lyric dialogs, and newsletter confirmation. Remove Spotify presave/OAuth, unfinished playback, and inert archive search. Review on `workers.dev` before any production-domain cutover.
