import { DurableObject } from 'cloudflare:workers'
import { handleNewsletterStorage, cleanupNewsletterStorage } from './storage.ts'

export class NewsletterState extends DurableObject<Env> {
  fetch(request: Request) {
    return handleNewsletterStorage(request, this.ctx.storage)
  }
  alarm() {
    return cleanupNewsletterStorage(this.ctx.storage)
  }
}
