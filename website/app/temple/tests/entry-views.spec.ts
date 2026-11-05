import { expect, test } from '@playwright/test'

test('the intention is a continuous poem with entry invitations and a minimal header', async ({
  page,
}) => {
  await page.goto('/temple-entry-poem')
  const artwork = page.locator('.temple-artwork')
  await expect(artwork).toHaveAttribute('data-state', 'ready')
  await expect(artwork.locator('.facts-grid,.fact-story')).toHaveCount(0)
  await expect(artwork.locator('.first-pair')).toHaveCount(2)
  await expect(artwork.locator('.final-refrain')).toHaveCount(1)
  await expect(page.locator('.temple-entry-greeting')).toHaveCount(0)
  const welcome = await page.locator('.temple-entry-welcome').boundingBox()
  const firstPair = await artwork.locator('.first-pair').first().boundingBox()
  expect(firstPair!.y).toBeGreaterThanOrEqual(welcome!.y + welcome!.height)
  const header = page.locator('.temple-top-navigation')
  await expect(header).not.toBeVisible()
  await expect(
    header.locator('.temple-nav-brand,.temple-nav-date,.temple-nav-items,.temple-nav-progress'),
  ).toHaveCount(0)
  await page.locator('.temple-entry-welcome').scrollIntoViewIfNeeded()
  await page
    .locator('.temple-entry-welcome a')
    .evaluate((node) => scrollTo(0, scrollY + node.getBoundingClientRect().top))
  await expect(header).toBeVisible()
  await expect(
    header.getByRole('link', { name: 'Enter the Temple of Sound', exact: true }),
  ).toHaveAttribute('href', '/temple-of-sound/visit')
  await header.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close navigation' }).click()
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await page
    .locator('.temple-entry-closing')
    .getByRole('link', { name: 'Enter', exact: true })
    .click()
  await expect(page).toHaveURL(/\/temple-of-sound\/visit$/)
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-temple-view', 'inside')
})

for (const width of [390, 1440]) {
  test(`practical section paths render only facts and arrive below the header at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/temple-of-sound/create')
    const artwork = page.locator('.temple-artwork')
    await expect(artwork).toHaveAttribute('data-state', 'ready')
    await expect(
      artwork.locator('.temple-opening,.first-pair,.bridge-copy,.final-refrain'),
    ).toHaveCount(0)
    await expect(artwork.locator('.facts-grid')).toHaveCount(1)
    await expect(artwork.locator('.fact-story')).toHaveCount(3)
    await expect(page.locator('.temple-top-navigation')).toBeVisible()
    await expect
      .poll(async () =>
        page.locator('#create').evaluate((node) => Math.round(node.getBoundingClientRect().top)),
      )
      .toBeGreaterThan(60)
    const top = await page.locator('#create').evaluate((node) => node.getBoundingClientRect().top)
    expect(top).toBeLessThan(180)
    await expect(page.locator('.temple-nav-brand')).toHaveAttribute('href', '/temple-of-sound')
    await expect(page.locator('.temple-nav-separator-link')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test(`inside navigation scrolls native destinations and pending labels explain themselves at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/temple-of-sound/visit')
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    const nav = page.locator('.temple-nav-items')
    await nav.getByRole('link', { name: 'Watch fixture', exact: true }).click()
    await expect(page).toHaveURL(/\/temple-of-sound\/watch$/)
    await expect
      .poll(() =>
        page.locator('#watch').evaluate((node) => Math.round(node.getBoundingClientRect().top)),
      )
      .toBeLessThan(180)
    const pending = nav.getByRole('button', { name: 'Pending fixture A', exact: true })
    await pending.scrollIntoViewIfNeeded()
    await pending.click()
    await expect(page.getByRole('tooltip').filter({ hasText: 'coming soon' }).first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(pending).toHaveAttribute('aria-expanded', 'false')
    await expect(page).toHaveURL(/\/temple-of-sound\/watch$/)
  })
}

test('native practical and poem views remain readable without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    await page.goto('/temple-entry-poem')
    await expect(
      page
        .locator('.temple-entry-welcome')
        .getByRole('link', { name: 'Enter the Temple of Sound', exact: true }),
    ).toBeVisible()
    await expect(page.locator('.facts-grid,.fact-story')).toHaveCount(0)
    await page.goto('/temple-of-sound/watch')
    await expect(page.locator('.temple-opening,.first-pair')).toHaveCount(0)
    await expect(page.locator('#watch')).toBeVisible()
    await expect(page.locator('.temple-nav-brand')).toHaveAttribute('href', '/temple-of-sound')
  } finally {
    await context.close()
  }
})

test('old practical fragments retain newsletter return parameters', async ({ page }) => {
  await page.goto('/temple-entry-poem?newsletter=confirmed#watch')
  await expect(page).toHaveURL(/\/temple-of-sound\/watch\?newsletter=confirmed$/)
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-temple-view', 'inside')
})

test('old recording fragments resolve through published previews without entering', async ({
  page,
}) => {
  // Exercise compatibility against the native link surface independently of
  // whichever viewer implementation serves its destination.
  await page.route('**/temple-of-sound/watch', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<a class="temple-post-preview" id="fixture-latest" href="/temple-of-sound/watch/fixture-latest">Synthetic post</a>',
    }),
  )
  await page.route('**/temple-of-sound/watch/fixture-latest', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<p>Synthetic post destination</p>',
    }),
  )
  await page.goto('/temple-entry-poem#fixture-latest')
  await expect(page).toHaveURL(/\/temple-of-sound\/watch\/fixture-latest$/)
  expect(await page.evaluate(() => localStorage.getItem('hannesdiem.temple.entered'))).toBeNull()
})

test('verse queries select the passage within the complete poem', async ({ page }) => {
  await page.goto('/temple-entry-poem?verse=im%20in%20grief')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
  await expect(page.locator('.first-pair')).toHaveCount(2)
  await expect
    .poll(() =>
      page
        .locator('#verse-fixture-pair-2')
        .evaluate((node) => Math.round(node.getBoundingClientRect().top)),
    )
    .toBeLessThan(180)
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(1000)
})
