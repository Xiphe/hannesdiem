import { expect, test } from '@playwright/test'
import { templeEntryStorageKey } from '../app/temple/entry-state.ts'

test('sidebar Temple destination follows entry memory across pages, menu openings and tabs', async ({
  page,
  context,
}) => {
  await page.goto('/fixture-release', { waitUntil: 'networkidle' })
  const link = page.locator('[data-navigation-dialog] [data-temple-entry-link]').first()
  await expect(link).toHaveAttribute('href', '/temple-of-sound')
  const label = await link.textContent()
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()

  const other = await context.newPage()
  await other.goto('/fixture-links', { waitUntil: 'networkidle' })
  await other.evaluate((key) => localStorage.setItem(key, 'true'), templeEntryStorageKey)
  await expect(link).toHaveAttribute('href', '/temple-of-sound/visit')
  await expect(link).toHaveText(label!)
  await other.evaluate((key) => localStorage.removeItem(key), templeEntryStorageKey)
  await expect(link).toHaveAttribute('href', '/temple-of-sound')
  await other.close()

  await page.getByRole('button', { name: 'Close navigation', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).not.toBeVisible()
  // Storage writes in the same document do not dispatch a storage event.
  await page.evaluate((key) => localStorage.setItem(key, 'true'), templeEntryStorageKey)
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(link).toHaveAttribute('href', '/temple-of-sound/visit')
  await page.goto('/fixture-links', { waitUntil: 'networkidle' })
  await expect(link).toHaveAttribute('href', '/temple-of-sound/visit')
})

test('a practical Temple arrival is remembered when returning to the poem', async ({ page }) => {
  await page.goto('/temple-of-sound/visit', { waitUntil: 'domcontentloaded' })
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), templeEntryStorageKey))
    .toBe('true')
  await page.goto('/temple-of-sound', { waitUntil: 'domcontentloaded' })
  expect(await page.evaluate((key) => localStorage.getItem(key), templeEntryStorageKey)).toBe(
    'true',
  )
  await expect(page.locator('[data-temple-entry-link]').first()).toHaveAttribute(
    'href',
    '/temple-of-sound/visit',
  )
})

test('blocked entry storage leaves the sidebar menu and poem destination usable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage is disabled', 'SecurityError')
      },
    })
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/fixture-release', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toBeVisible()
  await expect(page.locator('[data-temple-entry-link]').first()).toHaveAttribute(
    'href',
    '/temple-of-sound',
  )
  expect(errors).toEqual([])
})

test('the native sidebar Temple destination stays the poem without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    await page.goto('/fixture-release')
    await expect(page.locator('[data-temple-entry-link]').first()).toHaveAttribute(
      'href',
      '/temple-of-sound',
    )
  } finally {
    await context.close()
  }
})
