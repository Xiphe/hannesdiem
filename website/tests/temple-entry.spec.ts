import { expect, test, type Page } from '@playwright/test'
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
  await expect(link).toHaveAttribute('href', '/temple-of-sound/watch')
  await expect(link).toHaveText(label!)
  await other.evaluate((key) => localStorage.removeItem(key), templeEntryStorageKey)
  await expect(link).toHaveAttribute('href', '/temple-of-sound')
  await other.close()

  await page.getByRole('button', { name: 'Close navigation', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).not.toBeVisible()
  // Storage writes in the same document do not dispatch a storage event.
  await page.evaluate((key) => localStorage.setItem(key, 'true'), templeEntryStorageKey)
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(link).toHaveAttribute('href', '/temple-of-sound/watch')
  await page.goto('/fixture-links', { waitUntil: 'networkidle' })
  await expect(link).toHaveAttribute('href', '/temple-of-sound/watch')
})

async function ready(page: Page) {
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('[data-temple-entry-link]').first()).toHaveAttribute(
    'href',
    /temple-of-sound/,
  )
}

async function preference(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), templeEntryStorageKey)
}

async function seedPreference(page: Page) {
  await page.goto('/fixture-links', { waitUntil: 'networkidle' })
  await page.evaluate((key) => localStorage.setItem(key, 'true'), templeEntryStorageKey)
}

for (const section of ['visit', 'watch', 'create', 'share']) {
  test(`a direct ${section} arrival leaves first-time visitors unentered`, async ({ page }) => {
    await page.goto(`/temple-of-sound/${section}`)
    await ready(page)
    expect(await preference(page)).toBeNull()
    await expect(page.locator('[data-temple-entry-link]').first()).toHaveAttribute(
      'href',
      '/temple-of-sound',
    )
    await page.goto('/temple-of-sound')
    await ready(page)
    await expect(page).toHaveURL('/temple-of-sound')
  })
}

test('manual Enter remembers Watch across fresh tabs using the existing flag', async ({
  page,
  context,
}) => {
  await page.goto('/temple-of-sound')
  await ready(page)
  expect(await preference(page)).toBeNull()
  await page.locator('.temple-entry-welcome a').click()
  await expect(page).toHaveURL('/temple-of-sound/watch')
  await ready(page)
  expect(await preference(page)).toBe('true')
  const other = await context.newPage()
  await other.goto('/temple-of-sound?notice=synthetic')
  await expect(other).toHaveURL('/temple-of-sound/watch?notice=synthetic')
  await ready(other)
  expect(await preference(other)).toBe('true')
  await other.close()
})

test('an existing preference redirects the bare index without leaving a throwaway history entry', async ({
  page,
}) => {
  await seedPreference(page)
  await page.goto('/temple-of-sound')
  await expect(page).toHaveURL('/temple-of-sound/watch')
  await ready(page)
  await page.goBack()
  await expect(page).toHaveURL('/fixture-links')
})

for (const control of ['.temple-intention-return a', '.temple-nav-brand']) {
  test(`${control} clears the preference before returning to the manifesto`, async ({
    page,
    context,
  }) => {
    await seedPreference(page)
    await page.goto('/temple-of-sound/watch')
    await ready(page)
    await page.locator(control).click()
    await expect(page).toHaveURL('/temple-of-sound')
    await ready(page)
    expect(await preference(page)).toBeNull()
    await page.reload()
    await ready(page)
    await expect(page).toHaveURL('/temple-of-sound')
    const other = await context.newPage()
    await other.goto('/temple-of-sound')
    await ready(other)
    await expect(other).toHaveURL('/temple-of-sound')
    await other.close()
  })
}

test('browser Back and Forward to the manifesto clear the preference, including after reload', async ({
  page,
}) => {
  await page.goto('/fixture-links')
  await page.goto('/temple-of-sound')
  await ready(page)
  await page.locator('.temple-entry-welcome a').click()
  await expect(page).toHaveURL('/temple-of-sound/watch')
  await ready(page)
  expect(await preference(page)).toBe('true')
  await page.goBack()
  await ready(page)
  await expect(page).toHaveURL('/temple-of-sound')
  expect(await preference(page)).toBeNull()
  await page.reload()
  await ready(page)
  await expect(page).toHaveURL('/temple-of-sound')
  await page.goBack()
  await expect(page).toHaveURL('/fixture-links')
  await page.evaluate((key) => localStorage.setItem(key, 'true'), templeEntryStorageKey)
  await page.goForward()
  await ready(page)
  await expect(page).toHaveURL('/temple-of-sound')
  expect(await preference(page)).toBeNull()
  await page.goForward()
  await ready(page)
  await expect(page).toHaveURL('/temple-of-sound/watch')
  expect(await preference(page)).toBeNull()
})

test('cached manifesto restoration clears entry without mounting a new document', async ({
  playwright,
  browserName,
  baseURL,
}) => {
  test.skip(browserName !== 'chromium', 'Exercise the full Chromium back/forward cache.')
  const browser = await playwright.chromium.launch({
    channel: 'chromium',
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
  })
  try {
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()
    await page.goto('/temple-of-sound')
    await ready(page)
    await page.evaluate(() => {
      document.documentElement.dataset.entryDocument = 'original'
      addEventListener('pageshow', (event) => {
        document.documentElement.dataset.entryPersisted = String(event.persisted)
      })
    })
    await page.locator('.temple-entry-welcome a').click()
    await expect(page).toHaveURL('/temple-of-sound/watch')
    await ready(page)
    expect(await preference(page)).toBe('true')
    await page.goBack({ waitUntil: 'commit' })
    await expect(page.locator('html')).toHaveAttribute('data-entry-document', 'original')
    await expect(page.locator('html')).toHaveAttribute('data-entry-persisted', 'true')
    await expect.poll(() => preference(page)).toBeNull()
    await expect(page.locator('[data-temple-entry-link]').first()).toHaveAttribute(
      'href',
      '/temple-of-sound',
    )
  } finally {
    await browser.close()
  }
})

for (const destination of ['?verse=im%20in%20grief', '#watch', '#fixture-text']) {
  test(`remembered entry preserves the explicit destination ${destination}`, async ({ page }) => {
    await seedPreference(page)
    await page.goto(`/temple-of-sound${destination}`)
    if (destination.startsWith('?')) {
      await ready(page)
      await expect(page).toHaveURL(`/temple-of-sound${destination}`)
      await expect
        .poll(() =>
          page
            .locator('#verse-fixture-pair-2')
            .evaluate((node) => node.getBoundingClientRect().top),
        )
        .toBeLessThan(180)
    } else if (destination === '#watch') {
      await expect(page).toHaveURL('/temple-of-sound/watch')
      await ready(page)
    } else {
      await expect(page).toHaveURL('/feed/fixture-text')
      await expect(page.locator('.temple-feed')).toHaveAttribute(
        'data-current-post',
        'fixture-text',
      )
    }
    expect(await preference(page)).toBe('true')
  })
}

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
  await page.getByRole('button', { name: 'Close navigation', exact: true }).click()
  await page.goto('/temple-of-sound')
  await ready(page)
  await page.locator('.temple-entry-welcome a').click()
  await expect(page).toHaveURL('/temple-of-sound/watch')
  await ready(page)
  await page.locator('.temple-nav-brand').click()
  await expect(page).toHaveURL('/temple-of-sound')
  await ready(page)
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
