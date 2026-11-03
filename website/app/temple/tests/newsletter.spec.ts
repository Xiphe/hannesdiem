import { expect, test, type Route } from '@playwright/test'

const endpoint = '**/newsletter/temple'
async function submittedFields(route: Route) {
  return new Response(new Uint8Array(route.request().postDataBuffer()!), {
    headers: route.request().headers(),
  }).formData()
}

const anonymous = { ready: true, csrfToken: 'fixture-csrf' }
const address = 'aster@example.org'

async function openSignup(page: import('@playwright/test').Page) {
  await page.goto('/temple-facts', { waitUntil: 'networkidle' })
  const signup = page.locator('#fixture-watch .temple-signup')
  const followingTop = () =>
    page
      .locator('#fixture-watch')
      .evaluate((node) => node.nextElementSibling!.getBoundingClientRect().top + scrollY)
  const before = await followingTop()
  await signup.getByRole('link', { name: 'Fixture pending action' }).click()
  await expect(signup.getByRole('dialog')).toBeVisible()
  await expect.poll(followingTop).toBeCloseTo(before, 0)
  return signup
}

test('Temple signup validates name, floats through retry and updates after confirmation in another tab', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 900 })
  let verified = false
  let submits = 0
  await page.route(endpoint, async (route) => {
    if (route.request().method() === 'GET')
      return route.fulfill({
        json: verified
          ? { ...anonymous, email: address, name: 'Aster', subscribed: true, unsubscribed: false }
          : anonymous,
      })
    submits++
    const data = await submittedFields(route)
    expect(data.get('name')).toBe('Aster')
    expect(data.get('email')).toBe(address)
    expect(data.get('_csrf')).toBe(anonymous.csrfToken)
    expect(data.get('intent')).toBe('subscribe')
    return route.fulfill({
      status: submits === 1 ? 503 : 200,
      json:
        submits === 1
          ? { type: 'error', message: 'Synthetic retryable error.' }
          : {
              type: 'success',
              message: 'Synthetic pending confirmation.',
              confirmationPending: true,
            },
    })
  })
  const signup = await openSignup(page)
  await expect(signup.getByLabel('Name', { exact: true })).toHaveAttribute('required', '')
  await signup.getByLabel('Email address').fill(address)
  await signup.getByRole('button', { name: 'Fixture pending action' }).click()
  expect(submits).toBe(0)
  await signup.getByLabel('Name', { exact: true }).fill('Aster')
  await signup.getByLabel('Name', { exact: true }).press('Escape')
  const reopen = signup.getByRole('link', { name: 'Fixture pending action' })
  await expect(reopen).toBeVisible()
  await expect(reopen).toBeFocused()
  await expect(signup.locator('form')).toHaveCount(0)
  await reopen.click()
  await expect(signup.getByLabel('Name', { exact: true })).toHaveValue('Aster')
  await expect(signup.getByLabel('Email address')).toHaveValue(address)
  await signup.getByRole('button', { name: 'Fixture pending action' }).click()
  await expect(signup.getByRole('alert')).toHaveText('Synthetic retryable error.')
  await expect(signup.getByLabel('Name', { exact: true })).toHaveValue('Aster')
  await signup.getByRole('button', { name: 'Fixture pending action' }).click()
  await expect(signup.getByRole('status')).toHaveText('Synthetic pending confirmation.')
  await expect(signup.locator('form')).toHaveCount(0)
  await expect(page).toHaveURL(/\/temple-facts$/)
  verified = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(signup.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  await expect(signup.getByRole('switch')).toBeEnabled()
  await expect(signup.getByLabel('Email address')).toHaveCount(0)
})

test('Temple signed-in toggle sends explicit topic intents and rolls back on failure', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const state = {
    ...anonymous,
    name: 'Aster',
    email: address,
    subscribed: true,
    unsubscribed: false,
  }
  let fail = true
  const intents: string[] = []
  await page.route(endpoint, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: state })
    const data = await submittedFields(route)
    intents.push(String(data.get('intent')))
    if (fail)
      return route.fulfill({
        status: 503,
        json: { type: 'error', message: 'Synthetic preference failure.' },
      })
    state.subscribed = data.get('intent') === 'subscribe'
    return route.fulfill({
      json: { type: 'success', message: 'Synthetic preference saved.', state },
    })
  })
  await page.goto('/temple-facts', { waitUntil: 'networkidle' })
  const signup = page.locator('#fixture-watch .temple-signup')
  const toggle = signup.getByRole('switch')
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(signup.getByRole('alert')).toHaveText('Synthetic preference failure.')
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  fail = false
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  expect(intents).toEqual(['unsubscribe', 'unsubscribe', 'subscribe'])
  await expect(page).toHaveURL(/\/temple-facts$/)
  await expect(signup.getByRole('dialog')).toHaveCount(0)
  await expect(signup.getByRole('link')).toHaveCount(0)
  await expect(signup).not.toContainText(address)
  await expect(toggle).toHaveAccessibleName('Receive notifications via mail')
})

test('Temple needs no missing name for verified subscribers and keeps global reactivation pending', async ({
  page,
}) => {
  const state = { ...anonymous, name: '', email: address, subscribed: false, unsubscribed: true }
  let submits = 0
  await page.route(endpoint, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: state })
    submits++
    expect((await submittedFields(route)).has('name')).toBe(false)
    return route.fulfill({
      json: {
        type: 'success',
        message: 'Synthetic pending reactivation.',
        confirmationPending: true,
      },
    })
  })
  await page.goto('/temple-facts', { waitUntil: 'networkidle' })
  const signup = page.locator('#fixture-watch .temple-signup')
  await expect(signup.locator('.temple-signup-reactivation')).toBeVisible()
  const toggle = signup.getByRole('switch')
  await toggle.click()
  await expect(signup.getByRole('status')).toHaveText('Synthetic pending reactivation.')
  expect(submits).toBe(1)
  await expect(signup.locator('input:not([type=hidden])')).toHaveCount(0)
  await expect(signup.getByRole('switch')).toHaveCount(0)
})

test('Temple signup can recover when loading private state fails', async ({ page }) => {
  let fail = true
  await page.route(endpoint, (route) =>
    route.fulfill(
      fail
        ? { status: 503, json: { type: 'error', message: 'Synthetic unavailable.' } }
        : { json: anonymous },
    ),
  )
  const signup = await openSignup(page)
  await expect(signup.getByLabel('Name', { exact: true })).toBeDisabled()
  fail = false
  await signup.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(signup.getByLabel('Name', { exact: true })).toBeEnabled()
})

test('a verified subscriber can unsubscribe even when their older contact has no name', async ({
  page,
}) => {
  const state = { ...anonymous, email: address, name: '', subscribed: true, unsubscribed: false }
  await page.route(endpoint, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: state })
    expect((await submittedFields(route)).get('intent')).toBe('unsubscribe')
    state.subscribed = false
    return route.fulfill({ json: { type: 'success', message: 'Synthetic opt-out.', state } })
  })
  await page.goto('/temple-facts', { waitUntil: 'networkidle' })
  const signup = page.locator('#fixture-watch .temple-signup')
  await expect(signup.getByLabel('Name', { exact: true })).toHaveCount(0)
  await signup.getByRole('switch').click()
  await expect(signup.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
})

for (const width of [390, 1440]) {
  test(`the floating signup remains usable above the following recording at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route(endpoint, (route) => route.fulfill({ json: anonymous }))
    await page.route('https://customer-fixture.cloudflarestream.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>Synthetic player</title>' }),
    )
    await page.goto('/temple-video')
    const signup = page.locator('#fixture-watch .temple-signup')
    await signup.getByRole('link', { name: 'Fixture pending action' }).click()
    const submit = signup.getByRole('button', { name: 'Fixture pending action' })
    await submit.scrollIntoViewIfNeeded()
    expect(
      await submit.evaluate((button) => {
        const box = button.getBoundingClientRect()
        return button.contains(
          document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
        )
      }),
    ).toBe(true)
  })
}

for (const width of [390, 1440]) {
  test(`Watch confirmation is centered and dismissible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.route(endpoint, (route) =>
      route.fulfill({ json: { ...anonymous, email: address, subscribed: true } }),
    )
    await page.goto('/temple-facts?newsletter=confirmed#fixture-watch')
    const signup = page.locator('#fixture-watch .temple-signup')
    await expect(signup.getByRole('status')).toHaveText(
      /Great, this worked!\s*I'll notify you when we've created something new\./,
    )
    await expect(signup.getByRole('status').locator('strong')).toHaveText('Great, this worked!')
    await expect(signup.getByRole('dialog')).toBeVisible()
    await expect
      .poll(() =>
        signup.getByRole('dialog').evaluate((node) => {
          const box = node.getBoundingClientRect()
          return Math.abs(box.top + box.height / 2 - innerHeight / 2)
        }),
      )
      .toBeLessThan(2)
    await expect(signup.locator('input')).toHaveCount(0)
    await signup.getByRole('button', { name: 'Close signup' }).click()
    await expect(signup.getByRole('switch')).toBeVisible()
    await expect(signup.getByRole('switch')).toBeFocused()
    await expect(signup.getByRole('dialog')).toHaveCount(0)
    await expect(signup).not.toContainText(address)
  })
}

test('mobile Watch piece fills 90% of the viewport and shows a spinner during sending', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  let complete: (() => void) | undefined
  await page.route(endpoint, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: anonymous })
    await new Promise<void>((resolve) => {
      complete = resolve
    })
    return route.fulfill({
      json: { type: 'success', message: 'Synthetic pending.', confirmationPending: true },
    })
  })
  const signup = await openSignup(page)
  const box = await signup.getByRole('dialog').boundingBox()
  expect(box!.width).toBeCloseTo(390 * 0.9, 0)
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  await signup.getByLabel('Name', { exact: true }).fill('Aster')
  await signup.getByLabel('Email address').fill(address)
  await signup.getByRole('button', { name: 'Fixture pending action' }).click()
  await expect(signup.locator('.temple-loading-spinner')).toBeVisible()
  await expect(signup.getByRole('button', { name: 'Fixture pending action' })).toBeDisabled()
  await expect.poll(() => Boolean(complete)).toBe(true)
  complete!()
  await expect(signup.getByRole('status')).toHaveText('Synthetic pending.')
  await expect(signup.locator('input')).toHaveCount(0)
})
