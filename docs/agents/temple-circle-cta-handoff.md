# Share circle / CTA coordination

From the Share thread, 2026-11-03. The artist explicitly requests coordination
with the “ctas” thread. Thread messaging is unavailable here; this is a handoff,
not an agreed interface. Share worktree:
`/home/agent/.codex/worktrees/ded5/hannesdiem`, branch `codex/temple-share`.

## Confirmed by the artist

- Claiming subscribes to Resend topic `dd5708c2-1134-4a8a-a628-0cdf89630bf0`.
- A signed-in visitor submits a public name/alias; the reserved dot and alias
  become visible to all visitors.
- The claim is the first step toward membership. Applications happen afterward;
  reserving does not mean admission.
- Signed-out visitors verify email through the common flow, then resume the
  claim. No place is held before verification and explicit confirmation. Offer
  another available place if the intended dot has been taken.
- Holding a place requires an active Share topic subscription. Topic unsubscribe
  must release the place, including changes made outside the website. External
  synchronization is still under investigation.
- The link works both ways: releasing the place unsubscribes the Share topic.
  The topic is exclusively for circle communication.
- Owners can rename their alias and release their place; Hannes can release
  places. No automatic reservation expiry initially.
- Full means full: no waitlist for this iteration.
- Show public names on hover, keyboard focus or tap. Duplicate aliases are fine.
- For the owner of a claimed place, change the button to the artist's exact word
  `welcome`; clicking it opens alias and release controls. Other visitors retain
  `Claim your spot`.
- Remove the preset host reservation; Hannes will claim as a regular user. Ten
  places are available, not nine guest places plus a seeded host.
- Email Hannes at `sound@hannesdiem.de` with the public alias and verified email
  after the person is logged in, confirmed and durably holding the place. This
  notification belongs to the initial claim. The fuller application happens
  later through personal follow-up; no application form is in this iteration.

## Proposed integration seam — awaiting coordination

Reuse the CTA thread's session, verification, topic subscription and reactivation
flow. Watch keeps its topic; Share needs its own server-owned purpose and safe
return/continuation to `/temple-of-sound#share`, rather than the fixed Watch return.
Keep the public circle alias distinct from the Resend contact name.

Share owns durable reservation state, public slot/alias reads and authenticated
claim/manage operations. Enforce slot uniqueness and one claim per identity at
the server. Subscription and reservation need retry-safe coordination because
Resend and local storage cannot commit atomically. Existing newsletter storage
sweeps expiring records; permanent reservations need their own persistence policy.
These are engineering proposals, not implementation approval.

## External unsubscribe research

Resend documents `contact.topics.updated`; its `topics` array contains only changed
topics. An explicit Share `opt_out` releases the place. Also handle global
unsubscribe (`contact.updated`) and contact deletion (`contact.deleted`). Verify
signed webhook requests, process idempotently, and reconcile current contact/topic
state to recover missed deliveries. A delayed event must not release a newer
claim: reconcile current upstream state before destructive action. An upstream
read failure is not proof of unsubscribe. Preserve explicit claiming on opt-in.

Sources: <https://resend.com/docs/webhooks/contacts/topics-updated>,
<https://resend.com/docs/webhooks/contacts/updated>,
<https://resend.com/docs/webhooks/contacts/deleted>,
<https://resend.com/docs/webhooks/verify-webhooks-requests>,
<https://resend.com/docs/webhooks/retries-and-replays>.

No existing webhook endpoint or signing-secret binding was found in either
worktree during research. Shared confirmation of the complete scope remains
pending before implementation. No claim backend or application copy added.

When working on shared CTA interfaces, read this handoff before hardening Watch-
specific token scope, continuation or public-name behavior. Record the accepted
shared interface here so the Share thread can consume it without duplicate auth.

## Implementation handoff, 2026-11-03

The artist confirmed the full scope (`lgtm`) and subsequently excluded an admin
panel. Share's implementation is now in the `ded5` worktree, uncommitted:

- `website/app/newsletter/session-router.ts` extracts the existing session,
  CSRF and bounded-form middleware; `circle/http.tsx` registers into that router.
- `NewsletterIdentity` adds a server-stored `circle` scope and validated preferred
  spot. `/login/api` authenticates and returns to Share without enrolling Watch
  or publishing an alias. Only the explicit later claim subscribes Share.
- `readTempleContact` and `setTempleTopic` accept an optional topic ID, defaulting
  to the existing Watch topic. Their existing callers remain unchanged.
- Circle provider preserves the private Resend contact name. Public alias and
  membership state are separate, in a new `CircleState` binding/SQLite DO.
- `/circle` native/JSON forms reuse the same verified identity and token issuance;
  `/circle/webhook` handles signed opt-out hints. Share owns claim/release and
  their retry-safe coupling to the topic.
- No admin HTTP route/panel. The private binding can release an exceptional place.

The Share branch began from a snapshot of this worktree's newsletter files
(contract/http/storage/resend/form/view/temple config+form and tests), taken under
`/tmp/temple-circle-cta-baseline` in this box. Compare against that snapshot when
integrating parallel changes, preserving this thread's later Watch work. Borrowed
PieceSurface and form styles retain this thread's existing visual material.
Do not replace Share's new token scope or continuation with Watch-specific logic.

The shared middleware and existing Watch tests, real Worker/SQLite tests with a
synthetic Resend transport, and circle browser flows have passed locally. Live
email verification still needs the project's Resend gopass entry; a signing secret
and webhook registration are production setup, not performed by this task.

## Consolidated in the main workspace, 2026-11-03

Both implementations now live in `/workspace/hannesdiem` on
`codex/temple-cta-share`. The source worktrees have been removed after archiving
tracked patches, untracked files and Git identities under
`/workspace/hannesdiem-handoff-2026-11-03`. Earlier paths and pending-interface
notes above are historical provenance, not current coordination instructions.

The merged interface is `createNewsletterSessionRouter`, server-owned token
purposes, topic-specific provider operations, and private `/newsletter/temple`
and `/circle` endpoints. Watch's later floating dialog is retained. Runtime
coverage exercises Watch confirmation followed by a circle claim with the same
identity, independent topic toggles, public aliases versus private contact names,
and retry after concurrent claims. The deployed recording and navigation remain
in the public CMX page.

GitHub deployment now accepts `RESEND_CIRCLE_WEBHOOK_SECRET` from Production and
checks that both topics default to `opt_out` before deployment. The signing
secret is not currently configured. Without it, alarms still reconcile occupied
places; `/circle/webhook` stays unavailable. No live provider writes or email
sends were performed while consolidating. Local preview intercepts Resend calls.
