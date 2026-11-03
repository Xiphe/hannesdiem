import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) {
  test(`contact card preserves page context and email at ${width}px`, async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined }))
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
    const save = page.getByRole('link', { name: 'Add contact card' })
    await expect(save).toHaveAttribute('href', '/_contact.vcf?email=mailto%3Aretreat%40example.org')
    const download = page.waitForEvent('download')
    await save.click()
    expect((await download).suggestedFilename()).toBe('contact.vcf')
  } finally {
    await context.close()
  }
})

test('shares the actual contact file during the click without navigating', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperties(navigator, {
      canShare: { value: (data: ShareData) => data.files?.[0] instanceof File },
      share: {
        value: async (data: ShareData) => {
          const file = data.files![0]
          Object.assign(window, {
            sharedContact: {
              name: file.name,
              type: file.type,
              active: navigator.userActivation.isActive,
              text: await file.text(),
            },
          })
        },
      },
    })
  })
  let fileRequests = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/_contact.vcf') fileRequests++
  })
  await page.goto('/fixture-contact', { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Contact fixture', exact: true }).click()
  const save = page.getByRole('link', { name: 'Add contact card' })
  await expect(save).toBeVisible()
  // The client entry arrives with the overlay frame.
  await page.waitForLoadState('networkidle')
  await save.focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'sharedContact')))
    .toMatchObject({
      name: 'contact.vcf',
      type: 'text/vcard',
      active: true,
    })
  const shared = await page.evaluate(() => Reflect.get(window, 'sharedContact'))
  expect(shared.text).toContain('EMAIL;TYPE=INTERNET:fixture@example.org\r\n')
  expect(shared.text).toContain('PHOTO;ENCODING=b;TYPE=JPEG:c3ludGhldGljLXBob3Rv\r\n')
  expect(shared.text).toContain('URL:https://fixture.example.org\r\n')
  expect(fileRequests).toBe(0)
  await expect(page.getByRole('dialog')).toBeVisible()
})

for (const mode of [
  'missing',
  'unsupported',
  'capability-error',
  'share-error',
  'sync-error',
  'cancel',
] as const) {
  test(`contact sharing handles ${mode}`, async ({ page }) => {
    await page.addInitScript((mode) => {
      Object.assign(window, { shareCalls: 0 })
      Object.defineProperties(navigator, {
        canShare: {
          value: () => {
            if (mode === 'capability-error') throw new TypeError('Fixture capability error')
            return mode !== 'unsupported'
          },
        },
        share: {
          value:
            mode === 'missing'
              ? undefined
              : () => {
                  Reflect.set(window, 'shareCalls', Reflect.get(window, 'shareCalls') + 1)
                  if (mode === 'sync-error') throw new TypeError('Fixture share error')
                  return Promise.reject(
                    new DOMException(
                      'Fixture share result',
                      mode === 'cancel' ? 'AbortError' : 'NotAllowedError',
                    ),
                  )
                },
        },
      })
    }, mode)
    await page.goto('/_contact?email=mailto%3Afixture%40example.org', { waitUntil: 'networkidle' })
    const initialUrl = page.url()
    let fileRequests = 0
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/_contact.vcf') fileRequests++
    })
    const download = mode === 'cancel' ? undefined : page.waitForEvent('download')
    await page.getByRole('link', { name: 'Add contact card' }).click()
    if (download) {
      expect((await download).suggestedFilename()).toBe('contact.vcf')
      expect(fileRequests).toBe(1)
    } else {
      await expect.poll(() => page.evaluate(() => Reflect.get(window, 'shareCalls'))).toBe(1)
      await page.waitForTimeout(100)
      expect(fileRequests).toBe(0)
      expect(page.url()).toBe(initialUrl)
    }
    expect(await page.evaluate(() => Reflect.get(window, 'shareCalls'))).toBe(
      ['share-error', 'sync-error', 'cancel'].includes(mode) ? 1 : 0,
    )
  })
}
