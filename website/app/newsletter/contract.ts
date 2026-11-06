export interface NewsletterState {
  ready: boolean
  email?: string
  csrfToken?: string
}

export interface TempleNewsletterState extends NewsletterState {
  name?: string
  subscribed?: boolean
  unsubscribed?: boolean
}

export const templeNewsletterPath = '/newsletter/temple'
export const templeReturnPath = '/temple-of-sound#watch'
export const templeMessages = {
  pending: 'Awesome, please check your email to confirm your interest',
  confirmed: 'Great, this worked!',
  confirmedDetail: "I'll notify you when we've created something new.",
  subscribed: 'You’re subscribed to Temple of Sound updates.',
  unsubscribed: 'You’re unsubscribed from Temple of Sound updates.',
  failure: 'Something went wrong. Please try again.',
  reactivation:
    'Confirming will reactivate email delivery. Updates from other topics you’re still subscribed to may resume too.',
} as const
export type TempleNewsletterResult = NewsletterResult & {
  state?: TempleNewsletterState
  confirmationPending?: boolean
}

/** Public response contract shared by the newsletter island and its form endpoints. */
export type NewsletterResult = (
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | { type: 'spam_protection'; message: string; remainingSeconds: number }
) & { csrfToken?: string; nameRequired?: boolean }
