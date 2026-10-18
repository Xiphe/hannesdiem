import { createApp } from './router.tsx'

const app = createApp()

export default {
  async fetch(request) {
    try {
      return await app.fetch(request)
    } catch (error) {
      console.error(JSON.stringify({ message: 'Request failed', error: String(error) }))
      return new Response('Internal server error', { status: 500, headers: { 'Cache-Control': 'no-store' } })
    }
  },
} satisfies ExportedHandler<Env>
