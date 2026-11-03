import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`contact card preserves page context and email at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/fixture-contact?view=fixture#context', { waitUntil: 'networkidle' })
    const initialUrl = page.url()
    const historyLength = await page.evaluate(() => history.length)
    const trigger = page.getByRole('link', { name: 'Contact fixture', exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Page dialog' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Fixture Person' })).toBeVisible()
    await expect(dialog.getByRole('link', { name: /^Email/ })).toHaveAttribute(
      'href',
      'mailto:fixture@example.org?subject=Fixture',
    )
    await expect(dialog.getByRole('link', { name: /^Signal/ })).toHaveAttribute(
      'href',
      'https://signal.me/#eu/fixture-share-token',
    )
    await expect(dialog.getByRole('link', { name: /^Telegram/ })).toHaveAttribute(
      'href',
      'https://t.me/fixture',
    )
    await expect(page).toHaveURL(initialUrl)
    expect(await page.evaluate(() => history.length)).toBe(historyLength)
    await expect(dialog.getByRole('link', { name: 'Add contact card' })).toHaveCount(0)
    await expect(dialog.getByRole('img', { name: 'Portrait of Fixture Person' })).toBeVisible()
    await expect(dialog.getByRole('heading')).toHaveCSS('font-family', 'CinzelDecorative, serif')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(page).toHaveURL(initialUrl)
    await expect(trigger).toBeFocused()
    await page.getByRole('link', { name: 'Contact retreat' }).click()
    await expect(dialog.getByRole('link', { name: /^Email/ })).toHaveAttribute(
      'href',
      'mailto:retreat@example.org',
    )
    await dialog.getByRole('button', { name: 'Close contact card' }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page).toHaveURL(initialUrl)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('contact links offer messaging without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    await page.goto('/fixture-contact')
    await page.getByRole('link', { name: 'Contact retreat' }).click()
    await expect(page.getByRole('heading', { name: 'Fixture Person' })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Signal/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Telegram/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Add contact card' })).toHaveCount(0)
  } finally {
    await context.close()
  }
})

for (const triggerName of ['Contact fixture', 'Contact retreat']) {
  test(`refresh keeps the underlying page after opening ${triggerName}`, async ({ page }) => {
    await page.goto('/fixture-scrolled-contact?view=fixture#context', { waitUntil: 'networkidle' })
    const initialUrl = page.url()
    const trigger = page.getByRole('link', { name: triggerName, exact: true })
    await trigger.scrollIntoViewIfNeeded()
    const scroll = await page.evaluate(() => scrollY)
    await trigger.click()
    await expect(page.getByRole('dialog', { name: 'Page dialog' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Fixture Person' })).toBeVisible()
    await expect(page).toHaveURL(initialUrl)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page).toHaveURL(initialUrl)
    await expect(page.getByRole('dialog', { name: 'Page dialog' })).not.toBeVisible()
    await expect(trigger).toBeVisible()
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll)
  })
}

test('contact dismissal does not consume the previous page history', async ({ page }) => {
  await page.goto('/fixture-release', { waitUntil: 'networkidle' })
  await page.goto('/fixture-contact', { waitUntil: 'networkidle' })
  const historyLength = await page.evaluate(() => history.length)
  for (const close of ['escape', 'button', 'outside']) {
    await page.getByRole('link', { name: 'Contact fixture', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Page dialog' })
    await expect(dialog.getByRole('heading', { name: 'Fixture Person' })).toBeVisible()
    if (close === 'escape') await page.keyboard.press('Escape')
    else if (close === 'button')
      await dialog.getByRole('button', { name: 'Close contact card' }).click()
    else await dialog.click({ position: { x: 4, y: 4 } })
    await expect(dialog).not.toBeVisible()
    await expect(page).toHaveURL(/\/fixture-contact$/)
    expect(await page.evaluate(() => history.length)).toBe(historyLength)
  }
  await page.goBack()
  await expect(page).toHaveURL(/\/fixture-release$/)
})
