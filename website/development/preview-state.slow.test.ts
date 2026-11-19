import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { createCookie } from 'remix/cookie'
import { previewPersistence } from './preview-state.ts'

test('an authenticated preview cookie still resolves its session after a process restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'preview-session-regression-'))
  const secret = 'synthetic-preview-signing-secret'
  const email = 'preview-fixture@example.org'
  const id = crypto.randomUUID()
  const compiled = await build({
    stdin: {
      contents: `
        import { createIdentityRouter } from './website/app/identity/router.ts';
        import { sessionStorage } from './website/app/newsletter/storage.ts';
        export { NewsletterState } from './website/app/newsletter/cloudflare.ts';
        export default { fetch(request, env) {
          const router = createIdentityRouter({ secret: env.NEWSLETTER_SESSION_SECRET, storage: sessionStorage(env), failureMessage: 'Fixture failure', reportRejection() {} });
          router.get('/identity', context => Response.json({ email: context.session.get('email') ?? null }));
          return router.fetch(request);
        } };
      `,
      resolveDir: process.cwd(),
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['cloudflare:workers'],
    jsx: 'automatic',
    jsxImportSource: 'remix/component',
  })
  const boot = (iteration: number) =>
    new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: compiled.outputFiles[0].text + `\n// UI iteration ${iteration}\n`,
        compatibilityDate: '2026-10-18',
        durableObjects: { NEWSLETTER_STATE: { className: 'NewsletterState', useSQLite: true } },
        bindings: { NEWSLETTER_SESSION_SECRET: secret },
        ...previewPersistence(directory),
      }),
    )
  const cookie = (
    await createCookie('hdm_user_session', { secrets: [secret] }).serialize(id)
  ).split(';')[0]
  const identity = async (mf: Miniflare) => {
    const response = await mf.dispatchFetch('https://example.org/identity', {
      headers: { Cookie: cookie },
    })
    assert.equal(response.status, 200)
    return ((await response.json()) as { email: string | null }).email
  }
  let mf = boot(1)
  try {
    await mf.ready
    const { NEWSLETTER_STATE } = await mf.getBindings<{
      NEWSLETTER_STATE: DurableObjectNamespace
    }>()
    const seeded = await NEWSLETTER_STATE.getByName('newsletter').fetch(
      `https://newsletter.internal/sessions/${id}`,
      { method: 'PUT', body: JSON.stringify({ data: [{ email }, {}] }) },
    )
    assert.equal(seeded.status, 204)
    assert.equal(await identity(mf), email, 'the original process recognizes the signed-in browser')
    await mf.dispose()
    mf = boot(2)
    await mf.ready
    assert.equal(
      await identity(mf),
      email,
      'updating the preview must not log out the same browser cookie',
    )
  } finally {
    await mf.dispose()
    await rm(directory, { recursive: true, force: true })
  }
})
