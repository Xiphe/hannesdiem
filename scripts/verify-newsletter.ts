import { audienceSegment } from '../app/newsletter/config.ts'

const key = process.env.RESEND_HANNESDIEM_DE_API_KEY
const siteSegment = process.env.RESEND_HANNESDIEM_DE_SEGMENT_ID
if (!key || !siteSegment) throw new Error('Set the existing Resend key and site segment ID.')
for (const id of new Set([audienceSegment, siteSegment])) {
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
console.log('Existing Resend newsletter segments verified; no contacts changed or email sent.')
