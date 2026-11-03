import { test, expect } from '@playwright/test'
import type { CircleView } from '../../circle/contract.ts'

for (const width of [390, 1440]) {
  test(`confirmed claim and management at ${width}px keep public and private state separate`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    const state: CircleView = {
      ready: true,
      email: 'synthetic@example.org',
      csrfToken: 'synthetic-csrf',
      places: [{ spot: 10, alias: 'Another participant' }],
    }
    let pendingClaim: (() => void) | undefined
    let holdClaim = true
    await page.route('**/circle', async (route) => {
      if (route.request().method() === 'POST') {
        const body = await new Response(route.request().postDataBuffer()!.toString(), {
          headers: { 'Content-Type': route.request().headers()['content-type'] },
        }).formData()
        expect(body.get('_csrf')).toBe('synthetic-csrf')
        if (body.get('intent') === 'claim') {
          if (holdClaim)
            await new Promise<void>((resolve) => {
              pendingClaim = resolve
            })
          state.own = { spot: Number(body.get('spot')), alias: String(body.get('alias')) }
          state.places.push(state.own)
        } else if (body.get('intent') === 'rename') {
          state.own!.alias = String(body.get('alias'))
        } else if (body.get('intent') === 'release') {
          state.places = state.places.filter((p) => p.spot !== state.own!.spot)
          delete state.own
        }
        await route.fulfill({ json: { type: 'success', message: 'Synthetic result', state } })
      } else await route.fulfill({ json: state })
    })
    await page.goto('/temple-circle')
    const circle = page.locator('#fixture-reservation .fact-circle')
    await expect(circle.getByRole('button', { name: 'Fixture claim' })).toBeEnabled()
    await circle.getByRole('button', { name: 'Fixture claim' }).click()
    const panel = page.locator('#fixture-reservation .circle-fields')
    await expect(panel.getByLabel('Public name or alias')).toBeFocused()
    await expect(circle.locator('.fact-circle-dot[data-candidate]')).toHaveCount(1)
    await panel.getByLabel('Public name or alias').fill('Public alias')
    await panel.getByRole('button', { name: 'Claim your spot', exact: true }).click()
    await expect.poll(() => Boolean(pendingClaim)).toBe(true)
    await expect(circle.locator('input:checked')).toHaveCount(0)
    holdClaim = false
    pendingClaim!()
    await expect(circle.getByRole('button', { name: 'Welcome', exact: true })).toBeVisible()
    await expect(circle.locator('input:checked')).toHaveCount(1)
    const owner = circle
      .locator('.fact-circle-place')
      .filter({ has: page.locator('input:checked') })
    await expect(owner.locator('.fact-circle-name')).toHaveText('Public alias')
    const publicName = circle
      .locator('.fact-circle-name')
      .filter({ hasText: 'Another participant' })
    await publicName.locator('..').hover()
    await expect(publicName).toHaveCSS('opacity', '1')
    await circle.getByRole('button', { name: 'Welcome', exact: true }).click()
    await panel.getByLabel('Public name or alias').fill('Renamed alias')
    await panel.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(
      circle.locator('.fact-circle-name').filter({ hasText: 'Renamed alias' }),
    ).toHaveCount(1)
    await panel.getByRole('button', { name: 'Release my spot' }).click()
    await expect(circle.getByRole('button', { name: 'Fixture claim' })).toBeEnabled()
    await expect(circle.locator('input:checked')).toHaveCount(0)
    await expect(panel).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('signed-out visitors verify before public alias and return to another available dot if needed', async ({
  page,
}) => {
  let signedIn = false
  await page.route('**/circle', async (route) => {
    if (route.request().method() === 'POST') {
      const body = await new Response(route.request().postDataBuffer()!.toString(), {
        headers: { 'Content-Type': route.request().headers()['content-type'] },
      }).formData()
      expect(body.get('intent')).toBe('verify')
      expect(body.get('email')).toBe('synthetic@example.org')
      expect(body.has('alias')).toBe(false)
      await route.fulfill({
        json: {
          type: 'success',
          message: 'Synthetic confirmation pending',
          confirmationPending: true,
        },
      })
    } else
      await route.fulfill({
        json: {
          ready: true,
          csrfToken: 'synthetic-csrf',
          places: signedIn ? [{ spot: 1, alias: 'Already reserved' }] : [],
          ...(signedIn ? { email: 'synthetic@example.org', selected: 1 } : {}),
        },
      })
  })
  await page.goto('/temple-circle')
  const circle = page.locator('#fixture-reservation .fact-circle')
  await circle.getByRole('button', { name: 'Fixture claim' }).click()
  const panel = page.locator('#fixture-reservation .circle-fields')
  await expect(panel.getByLabel('Public name or alias')).toHaveCount(0)
  await panel.getByLabel('Email address').fill('synthetic@example.org')
  await panel.getByRole('button', { name: 'Get Login Link' }).click()
  await expect(panel.getByRole('status')).toHaveText('Synthetic confirmation pending')
  await expect(circle.locator('input:checked')).toHaveCount(0)
  signedIn = true
  await page.goto('/temple-circle?circle=confirmed&spot=1#fixture-reservation')
  await expect(panel.getByLabel('Public name or alias')).toBeVisible()
  await expect(panel.locator('input[name="spot"]')).not.toHaveValue('1')
  await expect(circle.locator('input:checked')).toHaveCount(0)
})

test('a full circle has no waitlist, and reserved names remain keyboard accessible', async ({
  page,
}) => {
  await page.route('**/circle', (route) =>
    route.fulfill({
      json: {
        ready: true,
        csrfToken: 'synthetic-csrf',
        places: Array.from({ length: 10 }, (_, i) => ({
          spot: i + 1,
          alias: `Participant ${i + 1}`,
        })),
      },
    }),
  )
  await page.goto('/temple-circle')
  const circle = page.locator('#fixture-reservation .fact-circle')
  await expect(circle.getByRole('button', { name: 'Fixture claim' })).toBeDisabled()
  await expect(page.getByText('The circle is full.', { exact: true })).toBeVisible()
  const reserved = circle.locator('.fact-circle-place').first()
  await reserved.focus()
  await expect(reserved.locator('.fact-circle-name')).toHaveCSS('opacity', '1')
  await expect(page.locator('.circle-fields')).toHaveCount(0)
})

test('a conflicting claim updates availability and lets the visitor retry a free place', async ({
  page,
}) => {
  const state: CircleView = {
    ready: true,
    email: 'synthetic@example.org',
    csrfToken: 'synthetic-csrf',
    places: [],
  }
  let conflicted = false
  let firstSpot: number | undefined
  await page.route('**/circle', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: state })
    const body = await new Response(route.request().postDataBuffer()!.toString(), {
      headers: { 'Content-Type': route.request().headers()['content-type'] },
    }).formData()
    const spot = Number(body.get('spot'))
    if (!conflicted) {
      conflicted = true
      firstSpot = spot
      state.places.push({ spot, alias: 'Synthetic other participant' })
      state.selected = spot === 1 ? 2 : 1
      return route.fulfill({
        status: 409,
        json: { type: 'error', message: 'Synthetic conflict.', state },
      })
    }
    expect(spot).not.toBe(firstSpot)
    state.own = { spot, alias: String(body.get('alias')) }
    state.places.push(state.own)
    return route.fulfill({ json: { type: 'success', message: 'Synthetic claim.', state } })
  })
  await page.goto('/temple-circle')
  const section = page.locator('#fixture-reservation')
  await section.getByRole('button', { name: 'Fixture claim' }).click()
  await section.getByLabel('Public name or alias').fill('Synthetic alias')
  await section.getByRole('button', { name: 'Claim your spot', exact: true }).click()
  await expect(section.getByRole('alert')).toHaveText('Synthetic conflict.')
  await expect(section.getByLabel('Public name or alias')).toHaveValue('Synthetic alias')
  await section.getByRole('button', { name: 'Claim your spot', exact: true }).click()
  await expect(section.getByRole('button', { name: 'Welcome', exact: true })).toBeVisible()
})
