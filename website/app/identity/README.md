# Shared browser identity

Login, Temple Watch, Circle and the navigation island share one browser session.
`contract.ts` defines its private state and CSRF rejection marker. `client.ts`
coordinates the first state read and permits one token-rejection replay only when
the verified email is unchanged. Public CMX HTML remains anonymous.

`router.ts` composes Remix's cookie, session, bounded form, origin and CSRF
middleware. Feature routes use its `IdentityRouter`; they continue to own their
form actions and authorization. The newsletter HTTP adapter supplies persistence,
secret configuration, rejection wording and diagnostics. The existing
`hdm_user_session` cookie, `/login` refresh endpoint, storage keys and bindings are
unchanged.

The newsletter storage adapter still persists sessions alongside one-use
confirmation tokens in the existing `NEWSLETTER_STATE` Durable Object. Provider
profiles, subscriptions, token scopes and verification remain in newsletter and
Circle; this module introduces no separate identity store.

The synthetic session/startup/replay checks remain in
[`newsletter/newsletter.test.ts`](../newsletter/newsletter.test.ts), alongside the
login adapter they exercise. Circle's runtime checks exercise the same session
through its own private routes. See [ADR 0005](../../../docs/adr/0005-newsletter-state-on-workers.md)
and [ADR 0006](../../../docs/adr/0006-local-navigation-and-private-islands.md).
