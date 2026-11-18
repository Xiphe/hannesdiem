# ElectroCute archive and player

Goal and accepted scope: [ElectroCute Ziel](../../../docs/electrocute-goal.md).

The first implementation covers browsing and the highlight editing interaction.
The synthetic preview has four test sessions, a 96-second generated MP4 and
overlapping test highlights. It never publishes visitor contributions. Its
explicit `preview` mode saves drafts on the current device; only supplied public
highlights offer sharing. No artist background text or real recordings are
invented or published.

## Preview

```sh
npm run dev:electrocute
```

Open `/electrocute` on port 8787. This uses the existing synthetic website worker
and isolated preview server, without provider credentials or outgoing provider
requests. `PREVIEW_PORT` can select another port. The preview copies its own
assets before serving them so other builds do not invalidate it.

## Design

The existing system type and ElectroCute theme are the reference. The dark
palette uses `#020024`, `#022456`, `#ae1ee4` and `#fff8fb`; the light palette uses
`#fff8fb`, `#ffb8e4`, `#fd5ee0` and `#020024`. The site's existing gradient and
logo stay in place. New controls have small corner radii, and time values use
tabular numerals.

The archive is a chronological list with a separate Continue entry. On desktop,
the player sits beside the highlight list; on mobile they stack. Start and end
have independent text and slider inputs, and the preview plays exactly that
range. There are no highlight thumbnails or decorative introductory text.

## Data and navigation

`ElectroCuteArchive` is an ordinary CMX content component. Its contract contains
sessions and authored public highlights. `sessionDocument` uses CMX's document
reducer to select a session from the same Publication snapshot without mutating
the source. `/electrocute/:id` resolves through the archive document, so it needs
no separate authored page for each session.

Remix frame navigation deliberately preserves matching client entries. A
server-side `data-rmx-key` around the client boundary distinguishes the archive
and each session. This disposes the outgoing player and flushes progress when a
link changes the session. A key inside the client entry cannot replace that
outer lifecycle boundary.

Playback loads only the selected MP4, with native controls, sound and fullscreen.
Each device stores per-session positions and the most recently heard unfinished
session. A direct highlight link takes precedence over stored progress. Missing
or unavailable device storage does not prevent playback, and an unsuccessful
draft save leaves the form open.

## Remaining integration

Public visitor highlights, shared profile aliases, artist authorization and the
agentic text check are not implemented in this slice. `preview` must remain
limited to synthetic development documents. Public mutation routes will use the
existing verified session, origin/CSRF protection and uncached runtime state.
The feed expansion remains a later milestone.

CMX provides the content contract, document traversal and rendering. No installed
primitive was found for mutable highlight ranges, browser listening progress or
text moderation. These gaps were surfaced before adding the local interaction;
evaluate CMX primitives again at the public persistence boundary.

Use the real pCloud test link and artist-supplied session metadata for the next
playback verification, including mobile and long playback. The synthetic suite
tests Range-capable MP4 delivery, session navigation, local progress, range
editing, preview stopping and optional-storage failures. It never reads authored
content or production media.
