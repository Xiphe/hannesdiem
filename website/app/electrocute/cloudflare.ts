import { DurableObject } from 'cloudflare:workers'
import { HighlightService, HighlightError } from './service.ts'
import type { HighlightInput, HighlightIntent } from './contract.ts'

/** Binding-only requests carry identity and session bounds resolved by the Worker. */
export class ElectroCuteState extends DurableObject<Env> {
  private service() {
    return new HighlightService(this.ctx.storage, this.env.ELECTROCUTE_ARTIST_EMAIL)
  }
  async fetch(request: Request) {
    if (request.method !== 'POST') return new Response(null, { status: 405 })
    const body = (await request.json()) as {
      session: { id: string; duration: number }
      email?: string
      intent?: HighlightIntent
      input?: HighlightInput
    }
    try {
      const service = this.service()
      if (new URL(request.url).pathname === '/view')
        return Response.json(await service.view(body.session, body.email))
      if (!body.email || !body.intent || !body.input) return new Response(null, { status: 400 })
      return Response.json(await service.mutate(body.session, body.email, body.intent, body.input))
    } catch (error) {
      return new Response(null, { status: error instanceof HighlightError ? error.status : 503 })
    }
  }
  alarm() {
    // Retire alarms scheduled by the former text-review workflow.
    return this.ctx.storage.deleteAlarm()
  }
}
