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
