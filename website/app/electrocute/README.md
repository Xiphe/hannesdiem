# ElectroCute archive and player

Goal and accepted scope: [ElectroCute Ziel](../../../docs/electrocute-goal.md).

The implementation covers the archive, session playback and authenticated public
highlights. The local preview uses the artist-supplied session and runs the same
identity and contribution storage as the application, isolated on this machine.
No artist background text, musical highlights or additional recordings are invented.

## Preview

```sh
npm run dev:electrocute
```

Open `/electrocute` on port 8787. This builds the authored CMX Publication and
uses the isolated preview server without provider credentials or outgoing
provider requests. The browser loads the MP4 directly from pCloud. Login emails
are simulated: request a login, open `/__preview/email`, follow its confirmation
link and return to the session tab. Focus refreshes its authenticated state.
Contribution and login state persist locally in `.wrangler/state/electrocute-preview`
using Miniflare’s `resourcePersistencePath`; the former `durableObjectsPersist`
option is silently ignored by the installed compatibility converter. A restart
regression exercises the actual session storage and signed cookie.
Visitor submissions remain pending because no remote model is called. The configured
artist account can save directly. `PREVIEW_PORT` can select another port. The
preview copies its own assets before serving them so other builds do not invalidate it.

For the original four synthetic sessions, generated 96-second MP4 and overlapping
test highlights and device-local drafts, run `npm run dev:electrocute -- --synthetic`.
This mode and the website tests need no authored content. The `preview` component
prop explicitly selects local drafts instead of public submissions; authored
content leaves it unset.

## Design

The existing system type and ElectroCute theme are the reference. The dark
palette uses `#020024`, `#022456`, `#ae1ee4` and `#fff8fb`; the light palette uses
`#fff8fb`, `#ffb8e4`, `#fd5ee0` and `#020024`. The site's existing gradient and
logo stay in place. Controls follow the existing feed and form language, including
rounded grouped inputs and quiet overlay surfaces. The seek bar shows tabular time
values on hover or keyboard focus, on a separate vertical level from trim controls.

The archive is a chronological list with a separate Continue entry. On desktop,
the player sits beside the highlight list; on mobile they stack. Session headings
and the media stage are compact, with transport controls over the image using the
existing feed icons. The artist rejected the detached range form and requested
clipping directly inside the player, following the Twitch-style trimming interaction.

Set highlight places a default one-minute selection above the video's existing
full-session progress bar. This is the only trim surface: drag either edge, or
select one and adjust it with adjacent 44px `< | >` buttons or arrow keys
(one second). Shift plus an arrow adjusts one source frame when session metadata
provides its frame rate. Source frame rates are explicit, never inferred from
browser rendering speed. The first pCloud recording was probed at 60 fps.
The playhead and full-session playback continue independently while editing.

A floating preview anchored to the combined title/save/cancel control contains
only Play, a seek bar spanning the selected bounds and total passage length. Seeking there activates the passage end stop; seeking on the
main bar returns to full-session playback. It has no trim handles. Title, save and
an X form one control replacing Set highlight between playback and volume.
Trim nudges follow the selected edge without visible time labels. The feed is
the control reference: a circular central play button, fullscreen in the upper
right and the same vertical hover/focus volume treatment. Touch devices retain
sound toggling and use their system volume controls. Escape cancels and restores focus to the
trigger. The public name is never requested in the clipping UI. There are no
highlight thumbnails or decorative introductory text.

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

Playback loads only the selected MP4. The hydrated player supplies inline playback,
seek, sound, volume and fullscreen controls; native controls remain the fallback
without JavaScript. Fullscreen includes the trim UI.
Each device stores per-session positions and the most recently heard unfinished
session. A direct highlight link takes precedence over stored progress. Missing
or unavailable device storage does not prevent playback, and an unsuccessful
draft save leaves the form open. Page-lifetime listeners use `handle.signal`:
`queueTask`'s signal ends at the next render and cannot own focus or exit listeners.

## Public contributions

`/electrocute-api/:session` is an uncached runtime island separate from CMX HTML.
It uses the existing verified session, bounded form parser, origin and CSRF
middleware. The Worker resolves the session and its duration from the current
Publication; roles, author identity and duration never come from the submitted
payload. The server-side `ELECTROCUTE_ARTIST_EMAIL` setting identifies the artist.
Public results contain only public names and highlight fields, never login emails.

`ElectroCuteState` stores individual highlights and confirmed profile aliases in
SQLite-backed Durable Object KV storage. Owners edit or withdraw their own
highlights; the artist edits or hides any highlight. Withdrawal and artist hiding
are separate reversible flags. A creator cannot reverse an artist hide, and an
artist restore respects a creator's withdrawal. IDs stay stable across edits;
revision checks prevent silent overwrites from stale editors. Text-check results
also compare that revision, so an old inference cannot undo a correction or hide.

The public-name record is independent of Circle membership and private Resend
contact names. A separate collapsed Public profile section outside the player
allows explicit confirmation or update of the name, suggesting an active Circle
alias without claiming a place or changing subscriptions. New profiles without a
chosen name display as Listener. All highlights resolve their owner's current
profile at read time: name changes apply across sessions without rewriting ranges,
titles, IDs or revisions. No public-name snapshot is written to a new highlight;
submitted names on highlight writes are ignored, including artist corrections.
Approved legacy snapshots seed a missing profile once and are removed on access;
an existing profile always wins over an old snapshot. Profile updates pass the
text check independently and retain the previous name on rejection or outage.
A dedicated account page and avatars remain outside this change.

The small agentic check uses Workers AI with
[`llama-3.3-70b-instruct-fp8-fast`](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/).
Only title and public alias are sent. It checks directed abuse, threats and illegal
solicitation, allowing artistic language and ordinary profanity. Separate strict
boolean JSON decisions for title and alias are required. Parsed JSON objects,
JSON text and completion envelopes are normalized at the provider boundary. Rejection stays editable and private; outages, timeouts
and malformed responses stay pending and retry through a Durable Object alarm.
Artist contributions and corrections publish directly. Visitor text changes are
checked again; range-only changes reuse the previous text decision.

`npm run dev` and browser tests use Wrangler's `local` environment, intentionally
without an AI binding. Its storage bindings and vars are repeated because Wrangler
does not inherit them into named environments. Production has the AI binding. No deployment was performed. The production
policy and parser were exercised against the real model with synthetic texts:
all eight final examples passed (neutral English/German, enthusiastic profanity,
directed insult, threat, illegal offer, instruction injection and abusive alias).
The smaller initial model confused alias checks and harmless profanity, which
motivated the model choice. The final requests took 0.64–0.84 seconds each.
This sample establishes basic behavior, not exhaustive moderation accuracy.
The feed expansion remains a later milestone.

CMX provides the content contract, document traversal and rendering. Its installed
UGC verifier constrains markup elements and props; its document store commits
Publication updates. Neither supplies mutable visitor ranges, shared profile state,
listening progress or semantic text moderation. The previously surfaced CMX gap
therefore remains at this runtime boundary; these features use the existing
identity machinery and a separate mutable service rather than changing Publications.

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

The synthetic suite tests Range-capable MP4 delivery, session navigation, local
progress, range editing (mouse, real browser touch events and keyboard), preview stopping,
optional-storage failures, alias
confirmation, publication states and stable links. Service and Workers runtime
checks cover authorization, CSRF/origin rejection, server-resolved duration,
concurrent moderation, retries and reversible hiding. The existing Circle and
newsletter runtime suites also pass. They never read authored content or production
media. Operational QA additionally confirmed the simulated email-login round trip,
artist rights and editor on the actual pCloud session, without saving fake highlights.

The website gate passed in an isolated copy without `content/` or a generated
Publication, retaining only the app asset manifest and CMX environment needed by
the normal website checks. The local preview and real-source artifacts are
operational evidence rather than automated content regression fixtures.
