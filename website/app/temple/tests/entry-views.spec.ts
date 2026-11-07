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
  await expect(header.locator('.temple-nav-logo')).toBeVisible()
  await expect(header.locator('.temple-nav-enter')).toBeHidden()
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
  ).toHaveAttribute('href', '/temple-of-sound/watch')
  await header.getByRole('button', { name: 'Open menu' }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Close navigation' }).click()
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await page
    .locator('.temple-entry-closing')
    .getByRole('link', { name: 'Enter', exact: true })
    .click()
  await expect(page).toHaveURL(/\/temple-of-sound\/watch$/)
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
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
    await expect(dialog).toBeVisible()
    await expect
      .poll(async () => (await dialog.locator('[data-navigation-panel]').boundingBox())!.x)
      .toBeCloseTo(0, 0)
    await dialog.getByRole('button', { name: 'Close navigation' }).click()
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
      body: '<a class="temple-post-preview" id="fixture-latest" href="/feed/fixture-latest">Synthetic post</a>',
    }),
  )
  await page.route('**/feed/fixture-latest', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<p>Synthetic post destination</p>',
    }),
  )
  await page.goto('/temple-entry-poem#fixture-latest')
  await expect(page).toHaveURL(/\/feed\/fixture-latest$/)
  expect(await page.evaluate(() => localStorage.getItem('hannesdiem.temple.entered'))).toBeNull()
})

for (const fragment of ['fixture-text', '%66ixture-text']) {
  test(`legacy post fragment ${fragment} goes directly to the published feed destination`, async ({
    page,
  }) => {
    const navigations: string[] = []
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame())
        navigations.push(new URL(request.url()).pathname)
    })
    await page.goto(`/temple-entry-poem?notice=synthetic#${fragment}`)
    await expect(page).toHaveURL('/feed/fixture-text?notice=synthetic')
    await expect(page.locator('.temple-feed')).toHaveAttribute('data-current-post', 'fixture-text')
    await expect(page.locator('[data-back]')).toHaveAttribute('aria-label', 'Home')
    expect(navigations).toEqual(['/temple-entry-poem', '/feed/fixture-text'])
    expect(await page.evaluate(() => localStorage.getItem('hannesdiem.temple.entered'))).toBeNull()
  })
}

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

for (const width of [390, 1440]) {
  for (const javaScriptEnabled of [true, false]) {
    test(`Watch starts with manifesto return, feed, introduction and signup at ${width}px (JS ${javaScriptEnabled})`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        baseURL,
        javaScriptEnabled,
        viewport: { width, height: 900 },
      })
      try {
        const page = await context.newPage()
        await page.goto('/temple-of-sound/watch')
        if (javaScriptEnabled)
          await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
        const watch = page.locator('#watch')
        await expect(watch).toHaveCount(1)
        const order = await watch.evaluate((node) =>
          [
            ...node.querySelectorAll(
              '.temple-intention-return,.temple-post-previews,.fact-story,.fact-followup-action',
            ),
          ].map((element) => element.classList[0]),
        )
        expect(order).toEqual([
          'temple-intention-return',
          'temple-post-previews',
          'fact-story',
          'fact-action',
        ])
        const back = page.locator('.temple-intention-return')
        const feed = watch.locator('.temple-post-previews')
        const introduction = watch.locator('.fact-story')
        const signup = watch.locator('.fact-followup-action')
        await expect(back.getByRole('link')).toBeVisible()
        const boxes = await Promise.all(
          [back, feed, introduction, signup].map((locator) => locator.boundingBox()),
        )
        for (let i = 1; i < boxes.length; i++)
          expect(boxes[i]!.y).toBeGreaterThanOrEqual(boxes[i - 1]!.y + boxes[i - 1]!.height)
        const pictures = await introduction.locator('.fact-pictures').boundingBox()
        expect(pictures!.y).toBeGreaterThanOrEqual(boxes[1]!.y + boxes[1]!.height)
        const header = await page.locator('.temple-top-navigation').boundingBox()
        expect(boxes[0]!.y).toBeGreaterThanOrEqual(header!.y + header!.height)
        expect(boxes[1]!.y).toBeLessThan(350)
        await feed.locator('a').first().click()
        await expect(page).toHaveURL(/\/feed\/fixture-/)
      } finally {
        await context.close()
      }
    })
  }
}
