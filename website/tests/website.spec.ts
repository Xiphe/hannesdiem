import { expect, test } from '@playwright/test'

test('published CMS input renders without browser JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    expect((await page.goto('/fixture'))?.status()).toBe(200)
    await expect(page.locator('main')).toContainText('Synthetic page')
    await expect(page).toHaveTitle(/Synthetic title/)
    expect(await page.locator('style[data-rmx-style]').count()).toBeGreaterThan(0)
  } finally {
    await context.close()
  }
})

test('navigation hydrates independently and loads newsletter state when opened', async ({
  page,
}) => {
  const errors: string[] = []
  let requests = 0
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/login', (route) => {
    requests++
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ready: true, csrfToken: 'test-csrf' }),
    })
  })
  await page.goto('/fixture', { waitUntil: 'networkidle' })
  expect(requests).toBe(0)
  await page.evaluate(() => {
    Object.assign(window, { staticRoot: document.querySelector('main'), mutations: 0 })
    new MutationObserver((records) => {
      ;(window as any).mutations += records.length
    }).observe(document.querySelector('main')!, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })
  })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('region', { name: 'Newsletter', exact: true })).toBeVisible()
  await expect.poll(() => requests).toBe(1)
  await dialog.getByText('Fixture', { exact: true }).first().click()
  await expect(dialog.getByRole('link', { name: 'Fixture', exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => ({
      same: (window as any).staticRoot === document.querySelector('main'),
      mutations: (window as any).mutations,
    })),
  ).toEqual({ same: true, mutations: 0 })
  await page.getByRole('button', { name: 'Close navigation' }).click()
  await expect(dialog).not.toBeVisible()
  expect(errors).toEqual([])
})

for (const knownName of [false, true]) {
  test(`sidebar sends email first and ${knownName ? 'skips the saved name' : 'asks for a missing name and preserves retry values'}`, async ({
    page,
  }) => {
    let submits = 0
    await page.setViewportSize({ width: 390, height: 900 })
    await page.route('**/login', async (route) => {
      if (route.request().method() === 'GET')
        return route.fulfill({ json: { ready: true, csrfToken: 'fixture-csrf' } })
      const body = await new Response(new Uint8Array(route.request().postDataBuffer()!), {
        headers: route.request().headers(),
      }).formData()
      expect(body.get('email')).toBe('synthetic@example.org')
      expect(body.get('_csrf')).toBe('fixture-csrf')
      submits++
      if (submits === 1) {
        expect(body.has('name')).toBe(false)
        if (!knownName)
          return route.fulfill({
            json: { type: 'success', message: 'Synthetic missing name.', nameRequired: true },
          })
      } else {
        expect(body.get('name')).toBe('Aster')
        if (submits === 2)
          return route.fulfill({
            status: 503,
            json: { type: 'error', message: 'Synthetic delivery failure.' },
          })
      }
      return route.fulfill({ json: { type: 'success', message: 'Synthetic link sent.' } })
    })
    await page.goto('/fixture')
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const form = page.locator('.newsletter-form')
    await expect(form.getByLabel('Email address')).toBeEnabled()
    await expect(form.getByLabel('Name', { exact: true })).toHaveCount(0)
    await form.getByLabel('Email address').fill('synthetic@example.org')
    await form.getByRole('button', { name: 'Signup', exact: true }).click()
    if (!knownName) {
      const name = form.getByLabel('Name', { exact: true })
      await expect(name).toBeFocused()
      await expect(form.getByLabel('Email address')).toHaveValue('synthetic@example.org')
      await name.fill('Aster')
      await form.getByRole('button', { name: 'Signup', exact: true }).click()
      await expect(form.getByRole('alert')).toHaveText('Synthetic delivery failure.')
      await expect(name).toHaveValue('Aster')
      const button = await form.getByRole('button', { name: 'Signup', exact: true }).boundingBox()
      expect(button!.x).toBeGreaterThanOrEqual(0)
      expect(button!.x + button!.width).toBeLessThanOrEqual(390)
      await form.getByRole('button', { name: 'Signup', exact: true }).click()
    }
    await expect(form.getByRole('status')).toHaveText('Synthetic link sent.')
    await expect(form.locator('input:not([type=hidden])')).toHaveCount(0)
    expect(submits).toBe(knownName ? 1 : 3)
  })
}
