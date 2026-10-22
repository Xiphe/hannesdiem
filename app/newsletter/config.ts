export const audienceSegment = 'ebed0ce7-7220-4955-a176-6e2f31acb5bd'

export interface NewsletterEnvironment {
  NEWSLETTER_STATE?: { getByName(name: string): { fetch(request: Request): Promise<Response> } }
  NEWSLETTER_SESSION_SECRET?: string
  RESEND_HANNESDIEM_DE_API_KEY?: string
  RESEND_HANNESDIEM_DE_SEGMENT_ID?: string
}

export interface NewsletterServices {
  fetch?: typeof globalThis.fetch
}
