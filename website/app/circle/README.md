# Circle reservations

A claim is the first step toward membership; the fuller application is personal
follow-up. Ten places, one per verified email, no seeded host and no waitlist.
A place and the circle-only topic subscription are linked in both directions.

The CMX page declares `circle.reservation: 'temple-circle'`. It contains no member
state. This follows ADR0005/0006: the shared publication stays cacheable; identity
and runtime state live behind uncached endpoints. CMX publication primitives are
used for authored structure, not repurposed as a mutable reservation database.

## Modules

- `http.tsx` registers `/circle` within the existing newsletter session, bounded
  form and CSRF middleware. Identity always comes from that session. Watch and
  Share use distinct token scopes and fixed return paths. Verification resumes
  a claim; it does not subscribe or publish an alias by itself.
- `service.ts` owns uniqueness, explicit public aliases and durable transitions.
  `claiming` is unavailable but not publicly reserved; `active` is visible;
  `releasing` remains unavailable until topic opt-out finishes. Provider failure
  leaves recoverable state. No expiry is applied to reservations.
- `cloudflare.ts` exports one SQLite-backed `CircleState` Durable Object. It
  serializes operations, bounds upstream work to 20 seconds, and owns alarms.
  The in-flight transition and its recovery alarm are persisted together.
- `provider.ts` reuses CTA contact/topic operations, preserving unrelated topics,
  global opt-out unless freshly confirmed, and the contact's private name. The
  public alias never overwrites the Resend contact name.
- `webhook.ts` verifies bounded raw Resend payloads using `standardwebhooks`.
  Partial topic updates trigger reconciliation only for explicit circle opt-out.
  Global unsubscribe and contact deletion also trigger reconciliation. Current
  upstream state decides removal, so stale/replayed events cannot undo a newer
  opt-in. Reconciliation is idempotent; no unbounded webhook history is stored.
- `panel.tsx` shares native forms between the embedded circle and `/circle`'s
  no-JavaScript fallback. Public names are exposed on hover, focus and tap. Only
  the owner sees `welcome` and rename/release controls. There is no admin panel.

The notification outbox is persisted with the claim. Email goes to
`sound@hannesdiem.de` only after subscription and reservation succeed, with alias,
verified email and place. Retries use the claim UUID as the Resend idempotency
key. After 23 hours of unconfirmed delivery, automatic retry stops and emits a
claim-ID-only log for manual recovery, avoiding a duplicate beyond Resend's 24h
idempotency window. Releasing cancels any outstanding notification for that claim.

Alarms rotate through occupied places, one per minute, retrying incomplete work
and reconciling subscriptions. This recovers missed webhooks in at most ten
alarm turns under healthy upstream service. API failure is not an unsubscribe.

## Runtime setup

Wrangler declares the `CIRCLE_STATE` binding/export. Reuse the deployment's
`NEWSLETTER_STATE`, `NEWSLETTER_SESSION_SECRET`, `RESEND_HANNESDIEM_DE_API_KEY` and
`RESEND_HANNESDIEM_DE_SEGMENT_ID`. Share's topic is
`dd5708c2-1134-4a8a-a628-0cdf89630bf0`; Watch keeps its separate topic.

For prompt external unsubscribe synchronization, configure a Resend webhook at
`https://hannesdiem.de/circle/webhook` for `contact.topics.updated`,
`contact.updated`, and `contact.deleted`, and install its signing secret as
`RESEND_CIRCLE_WEBHOOK_SECRET`. Credentials belong in secret bindings/gopass,
never source or `.env` files. This task has not deployed or registered a webhook.

An operator can release an exceptional place through the private Durable Object
binding `/remove` operation with `{spot: N}`. It unsubscribes that participant's
circle topic before freeing their place. This operation has no public HTTP route.

## Validation

All fixtures are synthetic; no production prose, media, members or generated
publication is used as test data.

- `node --import remix/node-tsx --test website/app/circle/*.test.ts`
- `npx playwright test --config website/playwright.config.ts website/app/temple/tests/circle.spec.ts website/app/temple/tests/facts.spec.ts`

Runtime tests exercise the actual Worker session and SQLite Durable Objects,
with an isolated fake Resend transport. They cover verification/resume, racing
claims, privacy, CSRF, topic coupling, webhook signatures, stale event replay and
provider failure. Service tests cover recovery, notification retry, capacity,
renaming and absence of reservation expiry. Browser checks cover mobile/desktop
claim/manage flows, confirmation resume, full state and accessible names.

A circle reactivation confirmation authorizes one claim and its durable retries.
The session grant is consumed once the claim reaches the reservation service,
except for a place conflict that allows choosing another place. A later global
unsubscribe therefore requires another email confirmation, even in the same
browser session.
