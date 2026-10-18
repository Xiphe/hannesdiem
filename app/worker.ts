import { DurableObject } from 'cloudflare:workers'
import { createApp } from './router.tsx'
import { handleNewsletter, handleNewsletterStorage, cleanupNewsletterStorage } from './newsletter.ts'

export class NewsletterState extends DurableObject<Env> {
  fetch(request:Request) { return handleNewsletterStorage(request,this.ctx.storage) }
  alarm() { return cleanupNewsletterStorage(this.ctx.storage) }
}
export default {
  async fetch(request,env) {
    try {
      return await handleNewsletter(request,env) ?? await createApp(undefined,env).fetch(request)
    } catch {
      console.error(JSON.stringify({message:'Request failed',path:new URL(request.url).pathname}))
      return new Response('Internal server error',{status:500,headers:{'Cache-Control':'no-store'}})
    }
  },
} satisfies ExportedHandler<Env>
