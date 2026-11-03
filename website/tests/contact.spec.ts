import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`contact card preserves page context and email at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/fixture-contact', { waitUntil: 'networkidle' })
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
    const download = page.waitForEvent('download')
    await expect(dialog.getByRole('img', { name: 'Portrait of Fixture Person' })).toBeVisible()
    await expect(dialog.getByRole('heading')).toHaveCSS('font-family', 'CinzelDecorative, serif')
    await dialog.getByRole('link', { name: 'Add contact card' }).click()
    expect((await download).suggestedFilename()).toBe('contact.vcf')
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(page).toHaveURL(/\/fixture-contact$/)
    await expect(trigger).toBeFocused()
    await page.getByRole('link', { name: 'Contact retreat' }).click()
    await expect(dialog.getByRole('link', { name: /^Email/ })).toHaveAttribute(
      'href',
      'mailto:retreat@example.org',
    )
    await dialog.getByRole('button', { name: 'Close contact card' }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page).toHaveURL(/\/fixture-contact$/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('contact links offer messaging and a download without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    await page.goto('/fixture-contact')
    await page.getByRole('link', { name: 'Contact retreat' }).click()
    await expect(page.getByRole('heading', { name: 'Fixture Person' })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Signal/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Telegram/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Add contact card' })).toHaveAttribute(
      'download',
      'contact.vcf',
    )
  } finally {
    await context.close()
  }
})
