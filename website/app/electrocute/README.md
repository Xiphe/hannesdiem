# ElectroCute archive and player

Goal and accepted scope: [ElectroCute Ziel](../../../docs/electrocute-goal.md).

The first implementation covers browsing and the highlight editing interaction.
The local preview uses the artist-supplied session in the authored CMX content.
It never publishes visitor contributions. Its explicit `preview` mode saves
drafts on the current device; only supplied public highlights offer sharing.
No artist background text or additional recordings are invented or published.

## Preview

```sh
npm run dev:electrocute
```

Open `/electrocute` on port 8787. This builds the authored CMX Publication and
uses the isolated preview server without provider credentials or outgoing
provider requests. The browser loads the MP4 directly from pCloud. Local draft
tools are injected with CMX's document reducer by the development-only worker;
the authored Publication does not enable them. `PREVIEW_PORT` can select another
port. The preview copies its own assets before serving them so other builds do
not invalidate it.

For the original four synthetic sessions, generated 96-second MP4 and overlapping
test highlights, run `npm run dev:electrocute -- --synthetic`. This mode and the
website tests need no authored content.

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
limited to local development snapshots. Public mutation routes will use the
existing verified session, origin/CSRF protection and uncached runtime state.
The feed expansion remains a later milestone.

CMX provides the content contract, document traversal and rendering. No installed
primitive was found for mutable highlight ranges, browser listening progress or
text moderation. These gaps were surfaced before adding the local interaction;
evaluate CMX primitives again at the public persistence boundary.

The artist supplied session XLV from 23 April 2023, named `outside to ovations`,
for the first real playback verification. It is a 47:51.1 MP4 with H.264 1280×720
video and stereo AAC at 48 kHz. Filename metadata follows
`yymmdd_electrocute_RomanNumber_session_name`; the authored entry preserves the
Roman number and supplied wording. It has no invented musical highlights.

Real-source operational QA passed in Chromium on desktop and with a 390px touch
viewport. Previews played 00:30–00:33 and 45:00–45:03 on desktop and 20:00–20:03 in
touch emulation, stopped at the requested endpoints and decoded both video and
audio without media errors. The source responded with HTTP 206; the combined
checks received about 32.5 MB rather than downloading the complete 1.63 GB file.
Physical mobile playback, Safari, subjective audio quality and endurance remain
to be checked. Cover selection remains part of the separate image work.

The synthetic suite tests Range-capable MP4 delivery, session navigation, local progress, range
editing, preview stopping and optional-storage failures. It never reads authored
content or production media.
