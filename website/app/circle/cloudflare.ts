import { DurableObject } from 'cloudflare:workers'
import { CircleService, CircleConflict } from './service.ts'
import { circleProvider } from './provider.ts'

/** One serialized authority for the ten places and their subscription transitions. */
export class CircleState extends DurableObject<Env> {
  private service() {
    const deadline = AbortSignal.timeout(20_000)
    return new CircleService(
      this.ctx.storage,
      circleProvider(this.env, {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.any([deadline, ...(init?.signal ? [init.signal] : [])]),
          }),
      }),
    )
  }
  fetch(request: Request) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const service = this.service()
      const path = new URL(request.url).pathname
      if (request.method !== 'POST') return new Response(null, { status: 405 })
      const body = (await request.json()) as {
        email?: string
        alias?: string
        spot?: number
        reactivate?: boolean
      }
      try {
        if (path === '/view') return Response.json(await service.view(body.email))
        if (path === '/claim' && body.email)
          return Response.json(
            await service.claim(body.email, body.alias ?? '', body.spot!, body.reactivate),
          )
        if (path === '/rename' && body.email)
          return Response.json(await service.rename(body.email, body.alias ?? ''))
        if (path === '/release' && body.email)
          return Response.json(await service.release(body.email))
        if (path === '/reconcile' && body.email) {
          await service.reconcile(body.email)
          return new Response(null, { status: 204 })
        }
        if (path === '/remove' && Number.isInteger(body.spot)) {
          await service.remove(body.spot!)
          return new Response(null, { status: 204 })
        }
        return new Response(null, { status: 400 })
      } catch (error) {
        return new Response(null, {
          status: error instanceof CircleConflict ? 409 : error instanceof TypeError ? 400 : 503,
        })
      }
    })
  }
  alarm() {
    return this.ctx.blockConcurrencyWhile(() => this.service().maintain())
  }
}
