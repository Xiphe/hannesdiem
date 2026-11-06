import { getCsrfToken } from 'remix/middleware/csrf'
import type { IdentityRouter } from '../identity/router.ts'
import { reportNewsletterFailure } from '../newsletter/diagnostics.ts'
import * as s from 'remix/data-schema'
import * as checks from 'remix/data-schema/checks'
import type { NewsletterEnvironment, NewsletterServices } from '../newsletter/config.ts'
import { storageClient, digest } from '../newsletter/storage.ts'
import {
  sendConfirmation,
  isTempleMember,
  readNewsletterContact,
  signupName,
} from '../newsletter/resend.ts'
import { circleProvider } from './provider.ts'
import { circleClient } from './client.ts'
import {
  circlePath,
  circleMessages,
  availableCircleSpot,
  validCircleAlias,
  type CircleView,
  type CircleResult,
} from './contract.ts'
import { CirclePage } from './page.tsx'

/** Register inside the shared identity session / CSRF / bounded form pipeline. */
export function registerCircleRoutes(
  router: IdentityRouter,
  env: NewsletterEnvironment,
  services: NewsletterServices,
) {
  const call = circleClient(env)
  router.get(circlePath, async (context) => {
    if (!env.CIRCLE_STATE) return new Response(circleMessages.failure, { status: 503 })
    const email = context.session.get('email')
    if (typeof email === 'string') {
      const reconciled = await call('/reconcile', { email })
      if (!reconciled.ok) throw new Error('Circle reconciliation failed')
    }
    const response = await call('/view', { email: typeof email === 'string' ? email : undefined })
    if (!response.ok) throw new Error('Circle unavailable')
    const value = (await response.json()) as CircleView
    const contact =
      typeof email === 'string' && !value.own
        ? await circleProvider(env, services).read(email)
        : undefined
    const selected = Number(
      context.url.searchParams.get('spot') ?? context.session.get('circleSpot'),
    )
    const state: CircleView = {
      ...value,
      ready: true,
      csrfToken: getCsrfToken(context),
      ...(typeof email === 'string'
        ? {
            email,
            name: contact?.name,
            reactivation: Boolean(
              contact?.unsubscribed &&
              Number(context.session.get('circleConfirmedUntil') ?? 0) <= Date.now(),
            ),
          }
        : {}),
      selected: availableCircleSpot(value, selected),
    }
    return context.request.headers.get('Accept')?.includes('application/json')
      ? Response.json(state)
      : context.render(CirclePage({ state }))
  })
  router.post(circlePath, async (context) => {
    if (!env.CIRCLE_STATE) return new Response(circleMessages.failure, { status: 503 })
    const authenticated = context.session.get('email')
    const email = typeof authenticated === 'string' ? authenticated : context.formData.get('email')
    const intent = context.formData.get('intent')
    const spot = Number(context.formData.get('spot'))
    const alias = context.formData.get('alias')
    const rawName = context.formData.get('name')
    let name = typeof rawName === 'string' ? rawName.trim() : ''
    const state: CircleView = {
      ready: true,
      places: [],
      csrfToken: getCsrfToken(context),
      ...(typeof authenticated === 'string' ? { email: authenticated } : {}),
      selected: spot,
    }
    const reply = (result: CircleResult, status = 200) =>
      context.request.headers.get('Accept')?.includes('application/json')
        ? Response.json({ ...result, csrfToken: state.csrfToken }, { status })
        : context.render(
            CirclePage({
              state: result.state ?? state,
              result: {
                ...(rawName !== null && result.type !== 'success' ? { nameRequired: true } : {}),
                ...result,
                emailValue: typeof email === 'string' ? email : '',
                nameValue: typeof rawName === 'string' ? rawName.trim() : '',
              },
            }),
            { status },
          )
    if (intent === 'verify') {
      const parsed = s.parseSafe(
        s
          .string()
          .transform((x) => x.trim().toLowerCase())
          .pipe(checks.email(), checks.maxLength(254)),
        email,
      )
      if (!parsed.success || !Number.isInteger(spot) || spot < 1 || spot > 10)
        return reply({ type: 'error', message: circleMessages.failure }, 400)
      const profile = await readNewsletterContact(parsed.value, env, services)
      name = signupName(profile, rawName)
      if ((!authenticated && !name) || (!profile.name && name.length > 120))
        return reply(
          {
            type: rawName === null ? 'success' : 'error',
            message: 'Please enter your name.',
            nameRequired: true,
          },
          rawName === null ? 200 : 400,
        )
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('')
      const tokenHash = await digest(token)
      const issued = await storageClient(env)('/tokens/issue', {
        email: parsed.value,
        scope: 'circle',
        ...(!profile.name && name ? { name } : {}),
        spot,
        tokenHash,
      })
      if (!issued.ok)
        return reply(
          {
            type: 'error',
            message:
              issued.status === 429
                ? 'Please wait before requesting another login token.'
                : circleMessages.failure,
          },
          issued.status === 429 ? 429 : 503,
        )
      try {
        const contact = await circleProvider(env, services).read(parsed.value)
        const link = new URL('/login/api', context.url)
        link.searchParams.set('token', token)
        link.searchParams.set('scope', 'circle')
        await sendConfirmation(parsed.value, link.href, tokenHash, env, services, {
          name: contact.name,
          returning: contact.exists && (await isTempleMember(parsed.value, env, services)),
          reactivate: contact.unsubscribed,
        })
      } catch {
        reportNewsletterFailure(context.request, 'confirmation_delivery')
        await storageClient(env)('/tokens/revoke', { tokenHash })
        return reply({ type: 'error', message: circleMessages.failure }, 503)
      }
      return reply({ type: 'success', message: circleMessages.pending, confirmationPending: true })
    }
    if (typeof authenticated !== 'string')
      return reply({ type: 'error', message: circleMessages.failure }, 401)
    const contact = await circleProvider(env, services).read(authenticated)
    const reactivate = Number(context.session.get('circleConfirmedUntil')) > Date.now()
    if (intent === 'claim' && contact.unsubscribed && !reactivate)
      return reply(
        { type: 'error', message: circleMessages.pending, state: { ...state, reactivation: true } },
        409,
      )
    if ((intent === 'claim' || intent === 'rename') && !validCircleAlias(alias))
      return reply({ type: 'error', message: circleMessages.alias }, 400)
    if (!['claim', 'rename', 'release', 'move'].includes(String(intent)))
      return reply({ type: 'error', message: circleMessages.failure }, 400)
    const response = await call(`/${intent}`, { email: authenticated, alias, spot, reactivate })
    // A verification authorizes one claim, including its durable retry. Keeping
    // that grant would let a later global unsubscribe be undone without a new link.
    if (intent === 'claim' && response.status !== 409) context.session.unset('circleConfirmedUntil')
    if (!response.ok) {
      const latest = await call('/view', { email: authenticated })
      if (!latest.ok) throw new Error('Circle unavailable')
      const value = (await latest.json()) as CircleView
      return reply(
        {
          type: 'error',
          message: response.status === 409 ? circleMessages.taken : circleMessages.failure,
          state: { ...state, ...value, selected: availableCircleSpot(value, spot) },
        },
        response.status,
      )
    }
    const current = response
    const value = (await current.json()) as CircleView
    return reply({
      type: 'success',
      message: value.waiting
        ? circleMessages.full
        : intent === 'release'
          ? circleMessages.released
          : circleMessages.claimed,
      state: {
        ...state,
        ...value,
        places: value.places,
        own: value.own,
        processing: value.processing,
        reactivation: false,
      },
    })
  })
}
