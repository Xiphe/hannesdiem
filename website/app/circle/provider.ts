import type { NewsletterEnvironment, NewsletterServices } from '../newsletter/config.ts'
import { readTempleContact, resendRequest, setTempleTopic } from '../newsletter/resend.ts'
import { templeSegment } from '../newsletter/temple-config.ts'
import { circleTopic } from './contract.ts'

export function circleProvider(env: NewsletterEnvironment, services: NewsletterServices = {}) {
  return {
    read: (email: string) => readTempleContact(email, env, services, circleTopic),
    async subscribe(email: string, reactivate: boolean) {
      const contact = await readTempleContact(email, env, services, circleTopic)
      if (contact.unsubscribed && !reactivate) throw new Error('Confirmation required')
      if (!contact.exists) {
        const created = await resendRequest(
          '/contacts',
          {
            method: 'POST',
            body: JSON.stringify({
              email,
              unsubscribed: false,
              segments: [{ id: templeSegment }],
              topics: [{ id: circleTopic, subscription: 'opt_in' }],
            }),
          },
          env,
          services,
        )
        if (!created.ok) throw new Error('Circle subscription failed')
        await created.body?.cancel()
      } else {
        const segment = await resendRequest(
          `/contacts/${encodeURIComponent(email)}/segments/${templeSegment}`,
          { method: 'POST' },
          env,
          services,
        )
        if (!segment.ok) throw new Error('Circle segment update failed')
        await segment.body?.cancel()
        await setTempleTopic(email, true, env, services, circleTopic)
        if (contact.unsubscribed) {
          const response = await resendRequest(
            `/contacts/${encodeURIComponent(email)}`,
            {
              method: 'PATCH',
              body: JSON.stringify({ unsubscribed: false }),
            },
            env,
            services,
          )
          if (!response.ok) throw new Error('Circle delivery reactivation failed')
          await response.body?.cancel()
        }
      }
      // Do not write the public alias into the newsletter contact name.
    },
    async unsubscribe(email: string) {
      const contact = await readTempleContact(email, env, services, circleTopic)
      if (contact.exists) await setTempleTopic(email, false, env, services, circleTopic)
    },
    async notify(id: string, email: string, alias: string, spot: number) {
      const response = await resendRequest(
        '/emails',
        {
          method: 'POST',
          headers: { 'Idempotency-Key': `circle-claim-${id}` },
          body: JSON.stringify({
            from: 'Hannes Diem <hi@hannesdiem.de>',
            to: ['sound@hannesdiem.de'],
            reply_to: email,
            subject: 'Temple of Sound — circle',
            text: `${alias}\n${email}\nSpot ${spot}`,
          }),
        },
        env,
        services,
      )
      if (!response.ok) throw new Error('Circle notification failed')
      await response.body?.cancel()
    },
  }
}
export type CircleProvider = ReturnType<typeof circleProvider>
