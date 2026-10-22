import { html } from 'remix/html-template'
import {
  audienceSegment as AUDIENCE_SEGMENT,
  type NewsletterEnvironment,
  type NewsletterServices,
} from './config.ts'

async function resendRequest(
  path: string,
  init: RequestInit,
  env: NewsletterEnvironment,
  services: NewsletterServices,
): Promise<Response> {
  const send = services.fetch ?? globalThis.fetch
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${env.RESEND_HANNESDIEM_DE_API_KEY}`)
  headers.set('Content-Type', 'application/json')
  for (let attempt = 0; ; attempt++) {
    const response = await send(`https://api.resend.com${path}`, {
      ...init,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    })
    if (response.status !== 429 || attempt === 2) return response
    const retry = Number(response.headers.get('Retry-After'))
    await response.body?.cancel()
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(2000, Math.max(500, retry * 1000 || 1000))),
    )
  }
}

export async function sendConfirmation(
  email: string,
  link: string,
  tokenHash: string,
  env: NewsletterEnvironment,
  services: NewsletterServices,
) {
  const content = html`<!doctype html>
    <html>
      <body style="margin:0;background:#fff8fb;color:#020024;font-family:system-ui,sans-serif">
        <main style="max-width:500px;margin:auto;padding:40px 20px">
          <p>Hi there!</p>
          <p>Happy to see you joining us on hannesdiem.de!</p>
          <p>
            <a
              style="display:inline-block;background:#fd5ee0;color:#020024;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold"
              href="${link}"
              >Confirm Email</a
            >
          </p>
          <p style="font-size:10px;font-style:italic">(This link expires in 1 hour)</p>
          <p>
            I'll sometimes send you updates about new releases, concerts, events, and things I find
            interesting.<br />You can unsubscribe anytime.
          </p>
          <p>Cheers, <strong>Hannes</strong></p>
          <p style="font-size:10px;font-style:italic">
            If you didn't request this email, please just ignore it.<br />In case you get a lot of
            these emails, please let me know so I can block the sender.
          </p>
          <footer>
            <a href="https://hannesdiem.de/imprint">Imprint</a> ·
            <a href="https://hannesdiem.de/privacy">Privacy</a>
          </footer>
        </main>
      </body>
    </html>`
  const response = await resendRequest(
    '/emails',
    {
      method: 'POST',
      headers: { 'Idempotency-Key': `newsletter-${tokenHash}` },
      body: JSON.stringify({
        from: 'Hannes Diem <hi@hannesdiem.de>',
        to: [email],
        subject: 'Please confirm your email address',
        html: String(content),
        text: `Hi there!\n\nHappy to see you joining us on hannesdiem.de!\n\nConfirm Email: ${link}\n(This link expires in 1 hour)\n\nI'll sometimes send you updates about new releases, concerts, events, and things I find interesting. You can unsubscribe anytime.\n\nCheers, Hannes\n\nIf you didn't request this email, please just ignore it.\n\nImprint: https://hannesdiem.de/imprint\nPrivacy: https://hannesdiem.de/privacy`,
      }),
    },
    env,
    services,
  )
  if (!response.ok) throw new Error('Newsletter email delivery failed')
  await response.body?.cancel()
}

export async function ensureNewsletterContact(
  email: string,
  env: NewsletterEnvironment,
  services: NewsletterServices,
) {
  const contactPath = `/contacts/${encodeURIComponent(email)}`
  const existing = await resendRequest(contactPath, { method: 'GET' }, env, services)
  const segments = [...new Set([AUDIENCE_SEGMENT, env.RESEND_HANNESDIEM_DE_SEGMENT_ID!])]
  if (existing.status === 404) {
    await existing.body?.cancel()
    const created = await resendRequest(
      '/contacts',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          unsubscribed: false,
          segments: segments.map((id) => ({ id })),
        }),
      },
      env,
      services,
    )
    if (!created.ok) throw new Error('Newsletter contact creation failed')
    await created.body?.cancel()
    return
  }
  if (!existing.ok) throw new Error('Newsletter contact lookup failed')
  await existing.body?.cancel()
  for (const segment of segments) {
    const response = await resendRequest(
      `${contactPath}/segments/${encodeURIComponent(segment)}`,
      { method: 'POST' },
      env,
      services,
    )
    if (!response.ok) throw new Error('Newsletter segment update failed')
    await response.body?.cancel()
  }
}
