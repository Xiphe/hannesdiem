import { audienceSegment } from '../app/newsletter/config.ts'
import { templeSegment, templeTopic } from '../app/newsletter/temple-config.ts'
import { circleTopic } from '../app/circle/contract.ts'

const key = process.env.RESEND_HANNESDIEM_DE_API_KEY
const siteSegment = process.env.RESEND_HANNESDIEM_DE_SEGMENT_ID
if (!key || !siteSegment) throw new Error('Set the existing Resend key and site segment ID.')
for (const id of new Set([audienceSegment, siteSegment, templeSegment])) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error('Invalid Resend segment ID.')
  const response = await fetch(`https://api.resend.com/segments/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok)
    throw new Error(
      `Cannot read existing newsletter segment (HTTP ${response.status}); verify the segment ID and Resend contacts permissions.`,
    )
}
for (const [name, id] of [
  ['Temple', templeTopic],
  ['Circle', circleTopic],
]) {
  const topic = await fetch(`https://api.resend.com/topics/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  })
  if (!topic.ok) throw new Error(`Cannot read ${name} newsletter topic (HTTP ${topic.status}).`)
  const config = (await topic.json()) as { default_subscription?: string }
  if (config.default_subscription !== 'opt_out')
    throw new Error(
      `${name} topic must default to opt_out so only explicit subscribers receive updates.`,
    )
}
console.log(
  'Resend newsletter segments and Temple/Circle topics verified; no contacts changed or email sent.',
)
