/** Public response contract shared by the newsletter island and its form endpoints. */
export type NewsletterResult = (
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | { type: 'spam_protection'; message: string; remainingSeconds: number }
) & { csrfToken?: string }
