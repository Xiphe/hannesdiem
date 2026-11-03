import { test, expect, type Route } from '@playwright/test'
import type { CircleView } from '../../circle/contract.ts'

const sectionId = '#fixture-reservation'
async function fields(route: Route) {
  return new Response(new Uint8Array(route.request().postDataBuffer()!), {
    headers: route.request().headers(),
  }).formData()
}
for (const width of [390, 1440]) {
  test(`selection, claim, rename, move and release at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const state: CircleView = {
      ready: true,
      email: 'synthetic@example.org',
      name: 'Saved contact name',
      csrfToken: 'fixture-csrf',
      places: [{ spot: 10, alias: 'Another participant' }],
    }
    const intents: string[] = []
    let complete: (() => void) | undefined
    await page.route('**/circle', async (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ json: state })
      const body = await fields(route)
      const intent = String(body.get('intent'))
      intents.push(intent)
      expect(body.get('_csrf')).toBe(state.csrfToken)
      if (intent === 'claim') {
        await new Promise<void>((resolve) => {
          complete = resolve
        })
        state.own = { spot: Number(body.get('spot')), alias: String(body.get('alias')) }
        state.places.push(state.own)
      } else if (intent === 'rename') state.own!.alias = String(body.get('alias'))
      else if (intent === 'move') state.own!.spot = Number(body.get('spot'))
      else if (intent === 'release') {
        state.places = state.places.filter((p) => p.spot !== state.own!.spot)
        delete state.own
      }
      return route.fulfill({ json: { type: 'success', message: 'Synthetic saved.', state } })
    })
    await page.goto('/temple-circle')
    const section = page.locator(sectionId)
    const circle = section.locator('.fact-circle')
    await expect(circle.getByRole('button', { name: 'Fixture claim' })).toBeEnabled()
    await circle.getByRole('radio', { name: 'Spot 3', exact: true }).click()
    await expect(circle.getByRole('button', { name: 'welcome', exact: true })).toBeVisible()
    await expect(circle.getByRole('radio', { name: 'Spot 3', exact: true })).toBeChecked()
    await expect(circle).toHaveAttribute('data-target', '3')
    const alias = section.getByLabel('Name or Alias', { exact: true })
    await expect(alias).toHaveValue('Saved contact name')
    await expect(section).not.toContainText('synthetic@example.org')
    await section.getByRole('button', { name: 'Close signup' }).click()
    await expect(circle.getByRole('radio', { name: 'Spot 3', exact: true })).toBeChecked()
    await circle.getByRole('button', { name: 'welcome', exact: true }).click()
    await alias.fill('Public alias')
    await section.getByRole('button', { name: 'Claim your spot', exact: true }).click()
    await expect(section.locator('.temple-loading-spinner')).toBeVisible()
    await expect.poll(() => Boolean(complete)).toBe(true)
    complete!()
    await expect(section.getByRole('dialog')).toHaveCount(0)
    await expect(circle.getByRole('button')).toHaveCount(0)
    const owner = circle.getByRole('radio', { name: 'Spot 3: Public alias', exact: true })
    await expect(owner).toBeChecked()
    await expect(circle.locator('.fact-circle-dot[data-own]')).toHaveCount(1)
    await owner.click()
    await expect(section.getByRole('button', { name: 'Rename', exact: true })).toHaveCount(0)
    await alias.fill('Renamed alias')
    await expect(section.getByRole('button', { name: 'Rename', exact: true })).toBeVisible()
    await section.getByRole('button', { name: 'Rename', exact: true }).click()
    await expect(section.getByRole('dialog')).toHaveCount(0)
    await circle
      .getByRole('radio', { name: 'Spot 3: Renamed alias', exact: true })
      .press('ArrowRight')
    await expect(
      section.getByRole('radio', { name: 'Spot 3: Renamed alias', exact: true }),
    ).toBeChecked()
    await expect(section.getByRole('dialog', { name: 'change seat?' })).toBeVisible()
    await section.getByRole('button', { name: 'no', exact: true }).click()
    await expect(section.getByRole('dialog')).toHaveCount(0)
    await circle.getByRole('radio', { name: 'Spot 4', exact: true }).click()
    await section.getByRole('button', { name: 'yes', exact: true }).click()
    const moved = circle.getByRole('radio', { name: 'Spot 4: Renamed alias', exact: true })
    await expect(moved).toBeChecked()
    await moved.click()
    await expect(alias).toHaveValue('Renamed alias')
    await expect(section).not.toContainText('synthetic@example.org')
    await section.getByRole('button', { name: 'Release my spot' }).click()
    await expect(circle.getByRole('button', { name: 'Fixture claim' })).toBeVisible()
    await expect(circle.locator('input:checked')).toHaveCount(0)
    expect(intents).toEqual(['claim', 'rename', 'move', 'release'])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('signed-out claim asks for name, hides sent fields and resumes a free dot with the saved name', async ({
  page,
}) => {
  let signedIn = false
  await page.route('**/circle', async (route) => {
    if (route.request().method() === 'POST') {
      const body = await fields(route)
      expect(body.get('intent')).toBe('verify')
      expect(body.get('name')).toBe('Fixture private name')
      expect(body.get('email')).toBe('synthetic@example.org')
      expect(body.has('alias')).toBe(false)
      return route.fulfill({
        json: { type: 'success', message: 'Synthetic pending.', confirmationPending: true },
      })
    }
    return route.fulfill({
      json: {
        ready: true,
        csrfToken: 'fixture-csrf',
        places: signedIn ? [{ spot: 1, alias: 'Another' }] : [],
        ...(signedIn ? { email: 'synthetic@example.org', name: 'Saved name', selected: 2 } : {}),
      },
    })
  })
  await page.goto('/temple-circle')
  const section = page.locator(sectionId)
  await section.getByRole('button', { name: 'Fixture claim' }).click()
  await expect(section.getByRole('dialog')).toBeVisible()
  await section.getByLabel('Name', { exact: true }).fill('Fixture private name')
  await section.getByLabel('Email address').fill('synthetic@example.org')
  await section.getByRole('button', { name: 'Request login email', exact: true }).click()
  await expect(section.getByRole('status')).toHaveText(
    'Awesome, please check your email to confirm your interest',
  )
  await expect(section.locator('.circle-fields input')).toHaveCount(0)
  signedIn = true
  await page.goto('/temple-circle?circle=confirmed&spot=1#fixture-reservation')
  await expect(section.getByLabel('Name or Alias')).toHaveValue('Saved name')
  await expect(section.locator('input[name=spot]')).toHaveValue('2')
  await expect(section.getByRole('radio', { name: 'Spot 2', exact: true })).toBeChecked()
  await expect(section.getByRole('alert')).toHaveCount(0)
})

test('full circles accept waiting interest and keep reserved names accessible', async ({
  page,
}) => {
  const state: CircleView = {
    ready: true,
    csrfToken: 'fixture-csrf',
    email: 'synthetic@example.org',
    name: 'Saved name',
    places: Array.from({ length: 10 }, (_, i) => ({ spot: i + 1, alias: `Participant ${i + 1}` })),
  }
  await page.route('**/circle', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: state })
    expect((await fields(route)).get('intent')).toBe('claim')
    if (state.places.length === 10) state.waiting = true
    else {
      state.waiting = false
      state.own = { spot: 1, alias: state.name! }
      state.places.push(state.own)
    }
    return route.fulfill({ json: { type: 'success', message: 'Synthetic waiting.', state } })
  })
  await page.goto('/temple-circle')
  const section = page.locator(sectionId)
  await expect(
    section.getByRole('button', { name: 'Join the waiting list', exact: true }),
  ).toBeEnabled()
  const reserved = section.locator('.fact-circle-place').first()
  await reserved.focus()
  await expect(reserved.locator('.fact-circle-name')).toHaveCSS('opacity', '1')
  await section.getByRole('button', { name: 'Join the waiting list', exact: true }).click()
  await expect(section.getByLabel('Name or Alias')).toHaveValue('Saved name')
  await section
    .locator('.circle-fields')
    .getByRole('button', { name: 'Join the waiting list', exact: true })
    .click()
  await expect(section.getByRole('status')).toHaveText(
    'The circle is full. You’re on the waiting list.',
  )
  await expect(section.locator('.circle-fields input')).toHaveCount(0)
  state.places = state.places.filter((place) => place.spot !== 1)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await section.getByRole('button', { name: 'Close signup' }).click()
  await expect(section.getByRole('button', { name: 'Fixture claim' })).toBeVisible()
  await expect(section.locator('.fact-circle-dot[data-own]')).toHaveCount(0)
  await section.getByRole('radio', { name: 'Spot 1', exact: true }).click()
  await section.getByRole('button', { name: 'Claim your spot', exact: true }).click()
  await expect(section.locator('.fact-circle-dot[data-own]')).toHaveCount(1)
})

test('a long contact name is preserved and must be shortened before claiming', async ({ page }) => {
  const longName = 'A synthetic name over twenty'
  await page.route('**/circle', (route) =>
    route.fulfill({
      json: { ready: true, email: 'synthetic@example.org', name: longName, places: [] },
    }),
  )
  await page.goto('/temple-circle?circle=confirmed&spot=5#fixture-reservation')
  const section = page.locator(sectionId)
  await expect(section.getByLabel('Name or Alias')).toHaveValue(longName)
  await expect(section.getByRole('button', { name: 'Claim your spot', exact: true })).toBeDisabled()
  await section.getByLabel('Name or Alias').fill('Short name')
  await expect(section.getByRole('button', { name: 'Claim your spot', exact: true })).toBeEnabled()
  await section.getByLabel('Name or Alias').press('Escape')
  await expect(section.getByRole('dialog')).toHaveCount(0)
})
