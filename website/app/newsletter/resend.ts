import { html } from 'remix/html-template'
import { templeSegment, templeTopic } from './temple-config.ts'
import { templeMessages } from './contract.ts'
import {
  audienceSegment as AUDIENCE_SEGMENT,
  type NewsletterEnvironment,
  type NewsletterServices,
} from './config.ts'

export async function resendRequest(
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
  temple?: { name: string; reactivate?: boolean; returning?: boolean },
) {
  const content = temple
    ? html`<!doctype html>
        <html>
          <body style="margin:0;background:#fff8fb;color:#020024;font-family:system-ui,sans-serif">
            <main style="max-width:500px;margin:auto;padding:40px 20px">
              <p>
                Hey${temple.name ? ` ${temple.name}` : ''},${temple.returning ? ' welcome back to the Temple, click this button to get logged into the page.' : ''}
              </p>
              ${
                !temple.returning
                  ? html`<p>I'm so excited to build this space together with you!</p>
                      <p>Please confirm your E-Mail so that I can make sure it's actually you.</p>`
                  : ''
              }
              <p>
                <a
                  href="${link}"
                  style="display:inline-block;background:#282624;color:#f7ecdf;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold"
                  >${temple.returning ? 'Login' : 'Confirm interest'}</a
                >
              </p>
              <p>
                This link expires in one hour. If you didn’t request this, you can ignore this
                email.
              </p>
              <p>Lots of Love,<br />Hannes</p>
              ${temple.reactivate ? html`<p style="font-size:12px">${templeMessages.reactivation}</p>` : ''}
              <footer>
                <a href="https://hannesdiem.de/imprint">Imprint</a> ·
                <a href="https://hannesdiem.de/privacy">Privacy</a>
              </footer>
            </main>
          </body>
        </html>`
    : html`<!doctype html>
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
                I'll sometimes send you updates about new releases, concerts, events, and things I
                find interesting.<br />You can unsubscribe anytime.
              </p>
              <p>Cheers, <strong>Hannes</strong></p>
              <p style="font-size:10px;font-style:italic">
                If you didn't request this email, please just ignore it.<br />In case you get a lot
                of these emails, please let me know so I can block the sender.
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
        subject: temple
          ? temple.returning
            ? 'Temple of Sound: Login'
            : 'Temple of Sound: Confirm your interest'
          : 'Please confirm your email address',
        html: String(content),
        text: temple
          ? `Hey${temple.name ? ` ${temple.name}` : ''},${temple.returning ? ' welcome back to the Temple, click this button to get logged into the page.' : `\n\nI'm so excited to build this space together with you!\n\nPlease confirm your E-Mail so that I can make sure it's actually you.`}\n\n${temple.returning ? 'Login' : 'Confirm interest'}: ${link}\n\nThis link expires in one hour. If you didn’t request this, you can ignore this email.\n\nLots of Love,\nHannes${temple.reactivate ? `\n\n${templeMessages.reactivation}` : ''}\n\nImprint: https://hannesdiem.de/imprint\nPrivacy: https://hannesdiem.de/privacy`
          : `Hi there!\n\nHappy to see you joining us on hannesdiem.de!\n\nConfirm Email: ${link}\n(This link expires in 1 hour)\n\nI'll sometimes send you updates about new releases, concerts, events, and things I find interesting. You can unsubscribe anytime.\n\nCheers, Hannes\n\nIf you didn't request this email, please just ignore it.\n\nImprint: https://hannesdiem.de/imprint\nPrivacy: https://hannesdiem.de/privacy`,
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

export async function readTempleContact(
  email: string,
  env: NewsletterEnvironment,
  services: NewsletterServices,
  topicId = templeTopic,
) {
  const path = `/contacts/${encodeURIComponent(email)}`
  const response = await resendRequest(path, { method: 'GET' }, env, services)
  if (response.status === 404) {
    await response.body?.cancel()
    return { name: '', unsubscribed: false, subscribed: false, exists: false }
  }
  if (!response.ok) throw new Error('Newsletter contact lookup failed')
  const contact = (await response.json()) as { first_name?: string; unsubscribed: boolean }
  if (typeof contact.unsubscribed !== 'boolean') throw new Error('Invalid contact response')
  const topicsResponse = await resendRequest(`${path}/topics`, { method: 'GET' }, env, services)
  if (!topicsResponse.ok) throw new Error('Newsletter preferences lookup failed')
  const topics = (await topicsResponse.json()) as {
    data: { id: string; subscription: string }[]
    has_more?: boolean
  }
  if (!Array.isArray(topics.data) || topics.has_more) throw new Error('Incomplete topic response')
  return {
    exists: true,
    name: typeof contact.first_name === 'string' ? contact.first_name : '',
    unsubscribed: contact.unsubscribed,
    subscribed: topics.data.some(
      (topic) => topic.id === topicId && topic.subscription === 'opt_in',
    ),
  }
}

/** Change only Temple's topic; neither unsubscribe globally nor rewrite other topics. */
export async function setTempleTopic(
  email: string,
  subscribed: boolean,
  env: NewsletterEnvironment,
  services: NewsletterServices,
  topicId = templeTopic,
) {
  const response = await resendRequest(
    `/contacts/${encodeURIComponent(email)}/topics`,
    {
      method: 'PATCH',
      body: JSON.stringify([{ id: topicId, subscription: subscribed ? 'opt_in' : 'opt_out' }]),
    },
    env,
    services,
  )
  if (!response.ok) throw new Error('Newsletter preference update failed')
  await response.body?.cancel()
}

/** Called after email verification, or an authenticated opt-in for an active contact. */
export async function subscribeTemple(
  email: string,
  name: string,
  env: NewsletterEnvironment,
  services: NewsletterServices,
  reactivate = false,
) {
  const contact = await readTempleContact(email, env, services)
  if (contact.unsubscribed && !reactivate) throw new Error('Email confirmation required')
  const path = `/contacts/${encodeURIComponent(email)}`
  if (contact.exists) {
    const segment = await resendRequest(
      `${path}/segments/${templeSegment}`,
      { method: 'POST' },
      env,
      services,
    )
    if (!segment.ok) throw new Error('Newsletter segment update failed')
    await segment.body?.cancel()
    await setTempleTopic(email, true, env, services)
  }
  // Reactivate global delivery last: a failed segment/topic update must not
  // accidentally resume other mail while this subscription is still incomplete.
  const response = await resendRequest(
    contact.exists ? path : '/contacts',
    {
      method: contact.exists ? 'PATCH' : 'POST',
      body: JSON.stringify(
        contact.exists
          ? {
              first_name: name,
              ...(reactivate && contact.unsubscribed ? { unsubscribed: false } : {}),
            }
          : {
              email,
              first_name: name,
              unsubscribed: false,
              segments: [{ id: templeSegment }],
              topics: [{ id: templeTopic, subscription: 'opt_in' }],
            },
      ),
    },
    env,
    services,
  )
  if (!response.ok) throw new Error('Newsletter subscription failed')
  await response.body?.cancel()
}

/** Segment membership, rather than contact existence, distinguishes returning visitors. */
export async function isTempleMember(
  email: string,
  env: NewsletterEnvironment,
  services: NewsletterServices,
) {
  let after: string | undefined
  const seen = new Set<string>()
  while (true) {
    const query = new URLSearchParams({ limit: '100' })
    if (after) query.set('after', after)
    const response = await resendRequest(
      `/contacts/${encodeURIComponent(email)}/segments?${query}`,
      { method: 'GET' },
      env,
      services,
    )
    if (response.status === 404) {
      await response.body?.cancel()
      return false
    }
    if (!response.ok) throw new Error('Contact segment lookup failed')
    const page = (await response.json()) as { data: { id: string }[]; has_more?: boolean }
    if (!Array.isArray(page.data) || page.data.some((segment) => typeof segment.id !== 'string'))
      throw new Error('Invalid segment response')
    if (page.data.some((segment) => segment.id === templeSegment)) return true
    if (!page.has_more) return false
    after = page.data.at(-1)?.id
    if (!after || seen.has(after)) throw new Error('Incomplete segment response')
    seen.add(after)
  }
}

/** Verification stores the private name, without opting into either topic. */
export async function ensureTempleProfile(
  email: string,
  name: string,
  env: NewsletterEnvironment,
  services: NewsletterServices,
) {
  const contact = await readTempleContact(email, env, services)
  const path = `/contacts/${encodeURIComponent(email)}`
  if (!contact.exists || (!contact.name && name)) {
    const response = await resendRequest(
      contact.exists ? path : '/contacts',
      {
        method: contact.exists ? 'PATCH' : 'POST',
        body: JSON.stringify(
          contact.exists
            ? { first_name: name }
            : { email, first_name: name, unsubscribed: false, segments: [{ id: templeSegment }] },
        ),
      },
      env,
      services,
    )
    if (!response.ok) throw new Error('Contact profile update failed')
    await response.body?.cancel()
  }
  if (contact.exists) {
    const segment = await resendRequest(
      `${path}/segments/${templeSegment}`,
      { method: 'POST' },
      env,
      services,
    )
    if (!segment.ok) throw new Error('Contact segment update failed')
    await segment.body?.cancel()
  }
}
