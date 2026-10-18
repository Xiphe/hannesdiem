# Keep newsletter state on Workers; subscribers in Resend

Replace Payload/Neon login-cache access with a small SQLite Durable Object for atomic one-use email links and resend cooldowns. Retain Resend subscriber/segment integration and native Remix form/session primitives; no new runtime package or account-wide token permission. Existing sessions may reset during migration.

Personalized forms and auth responses are uncached; public CMX HTML stays shared-cacheable. Newsletter state is separate from content publication and website builds. Navigation is now included in public SSR; [ADR 0006](0006-local-navigation-and-private-islands.md) moves personalized state into its island.
