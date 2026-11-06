import { execFileSync } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'

export interface GmailCredentials {
  email: string
  name: string
  client_id: string
  client_secret: string
  refresh_token: string
}

export function readGmailCredentials(): GmailCredentials {
  try {
    const raw =
      process.env.QA_GMAIL_CREDENTIALS ||
      (process.env.QA_GMAIL_GOPASS_ENTRY &&
        execFileSync('gopass', ['show', '-o', process.env.QA_GMAIL_GOPASS_ENTRY], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 10_000,
        }))
    const credentials = JSON.parse(raw || '') as GmailCredentials
    if (
      !['email', 'name', 'client_id', 'client_secret', 'refresh_token'].every(
        (key) =>
          typeof credentials[key as keyof GmailCredentials] === 'string' &&
          credentials[key as keyof GmailCredentials].trim(),
      ) ||
      !/^[\w.+%-]+@[\w.-]+\.[a-z]{2,}$/i.test(credentials.email)
    )
      throw new Error()
    return credentials
  } catch {
    throw new Error(
      'Configure QA_GMAIL_CREDENTIALS or QA_GMAIL_GOPASS_ENTRY; see website/qa/README.md',
    )
  }
}

interface MessagePart {
  mimeType?: string
  body?: { data?: string }
  parts?: MessagePart[]
}
export interface GmailMessage {
  internalDate?: string
  payload?: MessagePart
}

export function findLoginLink(
  message: GmailMessage,
  origin: string,
  since: number,
): string | undefined {
  if (
    !message.internalDate ||
    !Number.isFinite(Number(message.internalDate)) ||
    Number(message.internalDate) < since
  )
    return
  function text(part: MessagePart): string {
    return [
      part.mimeType?.startsWith('text/') && part.body?.data
        ? Buffer.from(part.body.data, 'base64url').toString('utf8')
        : '',
      ...(part.parts ?? []).map(text),
    ].join('\n')
  }
  for (const candidate of text(message.payload ?? {}).match(/https?:\/\/[^\s<>"']+/g) ?? []) {
    try {
      const url = new URL(candidate.replace(/&amp;/g, '&').replace(/[).,]+$/, ''))
      if (
        url.origin === origin &&
        !url.username &&
        !url.password &&
        url.pathname === '/login/api' &&
        /^[a-f0-9]{64}$/.test(url.searchParams.get('token') ?? '')
      )
        return url.href
    } catch {
      // Other email links need not be valid login URLs.
    }
  }
}

export async function openGmailInbox(
  credentials: GmailCredentials,
  transport: typeof fetch = fetch,
) {
  async function json(url: string | URL, init: RequestInit = {}) {
    try {
      const response = await transport(url, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) throw new Error()
      return await response.json()
    } catch {
      throw new Error(
        'QA Gmail request failed; check the gmail.modify OAuth grant and Gmail API setup',
      )
    }
  }
  const token = (await json('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
      grant_type: 'refresh_token',
    }),
  })) as { access_token?: string; scope?: string }
  if (
    !token.access_token ||
    (token.scope && token.scope !== 'https://www.googleapis.com/auth/gmail.modify')
  )
    throw new Error('QA requires an OAuth grant with only gmail.modify')
  const headers = { Authorization: `Bearer ${token.access_token}` }
  const api = 'https://gmail.googleapis.com/gmail/v1/users/me/'
  const profile = (await json(api + 'profile', { headers })) as { emailAddress?: string }
  if (profile.emailAddress?.toLowerCase() !== credentials.email.toLowerCase())
    throw new Error('QA Gmail grant belongs to a different inbox')

  return {
    async waitForLogin(origin: string, since: number) {
      const deadline = Date.now() + 120_000
      const seen = new Set<string>()
      while (Date.now() < deadline) {
        const url = new URL(api + 'messages')
        url.searchParams.set(
          'q',
          `from:hi@hannesdiem.de to:${credentials.email} after:${Math.floor(since / 1000)}`,
        )
        url.searchParams.set('maxResults', '20')
        const result = (await json(url, { headers })) as { messages?: { id: string }[] }
        for (const { id } of result.messages ?? []) {
          if (seen.has(id)) continue
          seen.add(id)
          const message = (await json(api + `messages/${encodeURIComponent(id)}?format=full`, {
            headers,
          })) as GmailMessage
          const link = findLoginLink(message, origin, since)
          if (link)
            return {
              link,
              async archive() {
                await json(api + `messages/${encodeURIComponent(id)}/modify`, {
                  method: 'POST',
                  headers: { ...headers, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
                })
              },
            }
        }
        await setTimeout(2_000)
      }
      throw new Error('QA login email did not arrive within two minutes for this target')
    },
  }
}
