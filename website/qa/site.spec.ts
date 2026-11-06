import { expect, test } from '@playwright/test'

test('health, navigation, and Temple pages work on the running site', async ({ page }) => {
  const errors: string[] = []
  const origin = new URL(test.info().project.use.baseURL!).origin
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (
      url.origin === origin &&
      ['script', 'stylesheet', 'font'].includes(response.request().resourceType()) &&
      response.status() >= 400
    )
      errors.push(`${response.status()} ${url.pathname}`)
  })
  page.on('requestfailed', (request) => {
    const url = new URL(request.url())
    if (
      url.origin === origin &&
      ['script', 'stylesheet', 'font'].includes(request.resourceType()) &&
      request.failure()?.errorText !== 'net::ERR_ABORTED'
    )
      errors.push(`Failed asset: ${url.pathname}`)
  })

  const health = await fetch(new URL('/health', origin), { signal: AbortSignal.timeout(20_000) })
  expect(health.ok).toBe(true)
  expect(await health.json()).toMatchObject({ ok: true })

  const home = await page.goto('/', { waitUntil: 'load' })
  expect(home?.ok()).toBe(true)
  await expect(page.locator('main')).toBeVisible()
  await expect(page).toHaveTitle(/\S/)
  await page.locator('main img').evaluateAll(async (images) => {
    await Promise.all(
      images
        .filter((image) => {
          const box = image.getBoundingClientRect()
          return box.width > 0 && box.top < innerHeight && box.bottom > 0
        })
        .map((image) => (image as HTMLImageElement).decode()),
    )
  })

  for (const path of ['/temple-of-sound', '/temple-of-sound/visit']) {
    const response = await page.goto(path, { waitUntil: 'load' })
    expect(response?.ok()).toBe(true)
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  }
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const navigation = page.getByRole('dialog', { name: 'Navigation', exact: true })
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole('region', { name: 'Newsletter', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await navigation.getByRole('button', { name: 'Close navigation' }).click()
  await expect(navigation).not.toBeVisible()

  // Follow the actual application control; no assertions depend on authored copy.
  await page.locator('.temple-nav-brand').click()
  await expect(page).toHaveURL(new URL('/temple-of-sound', origin).href)
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  expect(errors).toEqual([])
})

test('navigation remains usable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    expect((await page.goto('/temple-of-sound/visit'))?.ok()).toBe(true)
    await expect(page.locator('main')).toBeVisible()
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const navigation = page.getByRole('dialog', { name: 'Navigation', exact: true })
    await expect(navigation).toBeVisible()
    await expect(navigation.getByRole('link', { name: 'Sign up or log in' })).toBeVisible()
    await navigation.getByRole('button', { name: 'Close navigation' }).click()
    await expect(navigation).not.toBeVisible()
  } finally {
    await context.close()
  }
})

test('an unknown URL returns a rendered 404', async ({ page }) => {
  const response = await page.goto(`/__qa_missing_${crypto.randomUUID()}`, { waitUntil: 'load' })
  expect(response?.status()).toBe(404)
  await expect(page.locator('main')).toBeVisible()
})
