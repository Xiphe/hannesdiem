import { expect, test, type BrowserContext, type Locator } from '@playwright/test'
import sharp from 'sharp'
import mediaFiles from '../.generated/media-files.json' with { type: 'json' }
import media from '../.generated/media.json' with { type: 'json' }

const mediaByKey = new Map(mediaFiles.map((file) => [file.key, file]))

async function mockRemoteMedia(context: BrowserContext) {
  const first = Object.values(media)[0]
  if (!first.src.startsWith('https://')) return
  const origin = new URL(first.src).origin
  await context.route(`${origin}/**`, (route) => {
    const file = mediaByKey.get(new URL(route.request().url()).pathname.slice(1))
    return file
      ? route.fulfill({ path: file.path, contentType: file.contentType })
      : route.fallback()
  })
}
test.beforeEach(async ({ context, page }) => {
  await mockRemoteMedia(context)
  await page.route('**/login', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ ready: true, csrfToken: 'test-csrf' }),
        })
      : route.fallback(),
  )
})
test('server renders content and styles without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  await mockRemoteMedia(context)
  try {
    const page = await context.newPage()
    const response = await page.goto('/halbkreis')
    expect(response?.status()).toBe(200)
    await expect(page.locator('main')).not.toBeEmpty()
    expect(await page.locator('style[data-rmx-style]').count()).toBeGreaterThan(0)
  } finally {
    await context.close()
  }
})
test('menu opens as a native dialog without changing static page DOM', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/one-week-album', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    const root = document.querySelector('main')!
    Object.assign(window, { staticRoot: root, mutations: 0 })
    new MutationObserver((records) => {
      ;(window as any).mutations += records.length
    }).observe(root, { childList: true, subtree: true, attributes: true, characterData: true })
  })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('dialog').getByRole('region', { name: 'Newsletter', exact: true }),
  ).toBeVisible()
  await page.getByRole('dialog').getByText('Work', { exact: true }).click()
  await expect(
    page.getByRole('dialog').locator('details').first().getByRole('link').first(),
  ).toBeVisible()
  expect(
    await page.evaluate(() => ({
      same: (window as any).staticRoot === document.querySelector('main'),
      mutations: (window as any).mutations,
    })),
  ).toEqual({ same: true, mutations: 0 })
  await page.getByRole('button', { name: 'Close navigation' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(errors).toEqual([])
})

for (const authenticated of [false, true]) {
  test(`menu opens immediately with a newsletter skeleton until ${authenticated ? 'authenticated' : 'anonymous'} session resolves`, async ({
    page,
  }) => {
    let requests = 0
    let finish!: () => void
    const ready = new Promise<void>((resolve) => {
      finish = resolve
    })
    await page.route('**/login', async (route) => {
      requests++
      await ready
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          ready: true,
          csrfToken: 'test-csrf',
          ...(authenticated ? { email: 'listener@example.org' } : {}),
        }),
      })
    })
    await page.goto(authenticated ? '/linktree' : '/halbkreis', { waitUntil: 'networkidle' })
    if (authenticated) {
      await page.locator('footer a[href="/halbkreis"]').click()
      await expect(page).toHaveURL(/\/halbkreis$/)
    }
    expect(requests).toBe(0)
    const historyLength = await page.evaluate(() => history.length)
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
    const newsletter = dialog.getByRole('region', { name: 'Newsletter', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('summary').first()).toBeVisible()
    await expect(newsletter.locator('.newsletter-skeleton')).toBeVisible()
    await expect(newsletter.getByRole('status')).toHaveText('Loading newsletter…')
    await expect(newsletter).toHaveAttribute('aria-busy', 'true')
    await expect(newsletter.getByRole('heading')).toHaveCount(0)
    await expect(newsletter.getByRole('textbox', { name: 'Email address' })).toHaveCount(0)
    await expect(newsletter.getByRole('button', { name: 'Logout', exact: true })).toHaveCount(0)
    await expect(page).toHaveURL(/\/halbkreis$/)
    expect(await page.evaluate(() => history.length)).toBe(historyLength)
    await expect.poll(() => requests).toBe(1)
    finish()
    await expect(newsletter.locator('.newsletter-skeleton')).toHaveCount(0)
    await expect(newsletter).toHaveAttribute('aria-busy', 'false')
    if (authenticated) {
      await expect(newsletter.getByText('listener@example.org', { exact: true })).toBeVisible()
      await expect(newsletter.getByRole('button', { name: 'Logout', exact: true })).toBeEnabled()
      await expect(newsletter.getByRole('heading')).toHaveCount(0)
      await expect(newsletter.getByRole('textbox', { name: 'Email address' })).toHaveCount(0)
    } else {
      await expect(newsletter.getByRole('heading', { name: 'Let’s stay in touch.' })).toBeVisible()
      await expect(newsletter.getByRole('textbox', { name: 'Email address' })).toBeEnabled()
    }
    expect(requests).toBe(1)
  })
}

test('newsletter skeleton ends on session failure and retry can resolve it', async ({ page }) => {
  let attempts = 0
  let finish!: () => void
  const ready = new Promise<void>((resolve) => {
    finish = resolve
  })
  await page.route('**/login', async (route) => {
    attempts++
    if (attempts === 1) {
      await ready
      return route.fulfill({ status: 503, body: 'Unavailable' })
    }
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ready: true, csrfToken: 'retry-csrf' }),
    })
  })
  await page.goto('/halbkreis', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const newsletter = page
    .getByRole('dialog', { name: 'Navigation', exact: true })
    .getByRole('region', { name: 'Newsletter', exact: true })
  await expect(newsletter.locator('.newsletter-skeleton')).toBeVisible()
  finish()
  await expect(newsletter.locator('.newsletter-skeleton')).toHaveCount(0)
  await expect(newsletter).toHaveAttribute('aria-busy', 'false')
  await expect(newsletter.getByRole('button', { name: 'Retry newsletter' })).toBeEnabled()
  await newsletter.getByRole('button', { name: 'Retry newsletter' }).click()
  await expect(newsletter.getByRole('textbox', { name: 'Email address' })).toBeEnabled()
  await expect(newsletter.getByRole('button', { name: 'Retry newsletter' })).toHaveCount(0)
  expect(attempts).toBe(2)
})

test('server-rendered navigation can open without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  try {
    const page = await context.newPage()
    await page.goto('/halbkreis')
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('details').first().getByRole('link').first()).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Sign up or log in' })).toBeVisible()
    await expect(dialog.locator('.newsletter-loading')).not.toBeVisible()
    await dialog.getByRole('button', { name: 'Close navigation' }).click()
    await expect(dialog).not.toBeVisible()
  } finally {
    await context.close()
  }
})
test('release lyrics open over the release, close on Escape, and support direct URLs', async ({
  page,
}) => {
  await page.goto('/halbkreis', { waitUntil: 'networkidle' })
  const title = await page.locator('main h1').textContent()
  const link = page.locator('main a[data-rmx-target="overlay"]').first()
  const song = await link.getAttribute('href')
  await link.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').locator('h1')).not.toBeEmpty()
  await expect(page).toHaveURL((url) => url.pathname === song)
  await expect(page.locator('main h1')).toHaveText(title!)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page).toHaveURL(/\/halbkreis$/)
  await page.goto(`/m${song}`)
  await expect(page).toHaveURL((url) => url.pathname === song)
  await expect(page.locator('main h1')).not.toBeEmpty()
})

for (const width of [320, 360, 768]) {
  test(`tracklist stays readable with compact lyrics controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/hoffnung', { waitUntil: 'networkidle' })
    const table = page.getByRole('table')
    const links = table.getByRole('link')
    expect(await links.count()).toBeGreaterThan(0)
    for (const link of await links.all()) {
      await expect(link).toHaveAccessibleName(/Lyrics/)
      await expect(link).toHaveAttribute('title', /Lyrics/)
      await expect(link.locator('svg')).toBeVisible()
      await expect(link.locator('span')).toHaveCount(1)
      if (width < 768) {
        await expect(link.locator('span')).toBeHidden()
        expect(
          await link.evaluate((element) => element.getBoundingClientRect().width),
        ).toBeLessThanOrEqual(44)
      } else {
        await expect(link.locator('span')).toBeVisible()
      }
    }
    const layout = await table.evaluate((element) => {
      const viewport = document.documentElement.clientWidth
      const table = element.getBoundingClientRect()
      return {
        fitsViewport: table.left >= 0 && table.right <= viewport,
        rowsDoNotOverlap: [...element.querySelectorAll('[role="row"]')].every((row) => {
          const cells = row.querySelectorAll('[role="cell"]')
          if (cells.length !== 4) return true
          const title = document.createRange()
          title.selectNodeContents(cells[1])
          const action = cells[2].getBoundingClientRect()
          const duration = cells[3].getBoundingClientRect()
          const link = cells[2].querySelector('a')?.getBoundingClientRect()
          return (
            [...title.getClientRects()].every((rect) => rect.right <= action.left + 1) &&
            (!link || link.right <= duration.left + 1) &&
            duration.right <= viewport
          )
        }),
      }
    })
    expect(layout).toEqual({ fitsViewport: true, rowsDoNotOverlap: true })
  })
}

for (const width of [360, 1280]) {
  test(`lyrics use canonical URLs and keep close inside the sheet at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/hoffnung', { waitUntil: 'networkidle' })
    const title = await page.locator('main h1').textContent()
    const link = page.locator('main a[data-rmx-target="overlay"]').first()
    const song = await link.getAttribute('href')
    await link.click()
    const dialog = page.getByRole('dialog', { name: 'Page dialog' })
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL((url) => url.pathname === song)
    await expect(page.locator('main h1')).toHaveText(title!)
    const contained = await dialog.locator('.lyrics-sheet').evaluate((el) => {
      const sheet = el.querySelector('article')!.getBoundingClientRect()
      const close = el.querySelector('[aria-label="Close lyrics"]')!.getBoundingClientRect()
      return (
        close.top >= sheet.top &&
        close.right <= sheet.right &&
        close.bottom <= sheet.bottom &&
        close.left >= sheet.left
      )
    })
    expect(contained).toBe(true)
    await dialog.getByRole('button', { name: 'Close lyrics' }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page).toHaveURL(/\/hoffnung$/)
    await page.goForward()
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL((url) => url.pathname === song)
    await page.reload()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.locator('main h1')).not.toBeEmpty()
  })
}
for (const width of [360, 1280]) {
  test(`media decodes and pages fit ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/halbkreis', { waitUntil: 'networkidle' })
    const image = page.locator('main img').first()
    if (await image.count()) {
      const result = await image.evaluate(async (img: HTMLImageElement) => {
        await img.decode()
        return img.naturalWidth
      })
      expect(result).toBeGreaterThan(0)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    )
  })
}

test('newsletter signup stays in the sidebar with pending and success feedback', async ({
  page,
}) => {
  let finish!: () => void
  let submissions = 0
  const responseReady = new Promise<void>((resolve) => {
    finish = resolve
  })
  await page.route('**/login', async (route) => {
    if (route.request().method() === 'GET') return route.fallback()
    expect(route.request().method()).toBe('POST')
    submissions++
    await responseReady
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ type: 'success', message: 'Link sent! Please check your email.' }),
    })
  })
  await page.goto('/halbkreis', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    ;(window as any).originalContent = document.querySelector('main')
  })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const input = dialog.getByRole('textbox', { name: 'Email address' })
  const submit = dialog.getByRole('region', { name: 'Newsletter', exact: true }).getByRole('button')
  await expect(submit).toBeEnabled()
  await submit.click()
  expect(await input.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true)
  await expect(input).toBeEnabled()
  await input.fill('listener@example.org')
  await submit.click()
  await expect(input).toBeDisabled()
  await expect(submit).toBeDisabled()
  finish()
  await expect(dialog.getByText('Link sent! Please check your email.')).toBeVisible()
  await expect(dialog).toBeVisible()
  await expect(input).toHaveCount(0)
  await expect(page).toHaveURL(/\/halbkreis$/)
  expect(
    await page.evaluate(() => (window as any).originalContent === document.querySelector('main')),
  ).toBe(true)
  expect(submissions).toBe(1)
})

test('newsletter cooldown and failures preserve the email and allow retry without closing the sidebar', async ({
  page,
}) => {
  let attempts = 0
  await page.route('**/login', async (route) => {
    if (route.request().method() === 'GET') return route.fallback()
    attempts++
    if (attempts === 1)
      return route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'spam_protection',
          message: 'Please wait before requesting another login token',
          remainingSeconds: 2,
        }),
      })
    if (attempts === 2)
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ type: 'error', message: 'Something went wrong. Please try again.' }),
      })
    if (attempts === 3) return route.abort('failed')
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ type: 'success', message: 'Link sent! Please check your email.' }),
    })
  })
  await page.goto('/halbkreis', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const input = dialog.getByRole('textbox', { name: 'Email address' })
  const submit = dialog.getByRole('region', { name: 'Newsletter', exact: true }).getByRole('button')
  await expect(input).toBeEnabled()
  await input.fill('listener@example.org')
  await submit.click()
  await expect(input).toBeDisabled()
  await expect(dialog.getByText(/Please wait/)).toBeVisible()
  await expect(submit).toBeEnabled()
  await expect(input).toHaveValue('listener@example.org')
  await submit.click()
  await expect(dialog.getByText('Something went wrong. Please try again.')).toBeVisible()
  await expect(input).toHaveValue('listener@example.org')
  await submit.click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(input).toHaveValue('listener@example.org')
  await expect(submit).toBeEnabled()
  await submit.click()
  await expect(dialog.getByText('Link sent! Please check your email.')).toBeVisible()
  await expect(dialog).toBeVisible()
})

test('newsletter logout stays inline and refreshes the anonymous signup session', async ({
  page,
}) => {
  let authenticated = true
  await page.route('**/logout', (route) => {
    authenticated = false
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ type: 'success', message: 'Logged out successfully' }),
    })
  })
  await page.route('**/login', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        authenticated
          ? { ready: true, email: 'listener@example.org', csrfToken: 'test-csrf' }
          : { ready: true, csrfToken: 'fresh-csrf' },
      ),
    }),
  )
  await page.goto('/halbkreis', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Logout' }).click()
  await expect(dialog.getByText('Logged out successfully')).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Email address' })).toBeEnabled()
  await expect(dialog.locator('input[name="_csrf"]')).toHaveValue('fresh-csrf')
  await expect(dialog).toBeVisible()
})

test('email confirmation shows a welcome notice once after the home redirect', async ({ page }) => {
  await page.goto('/?login_success=true')
  await expect(page.getByRole('status')).toHaveText('Welcome! You are now logged in.')
  await expect(page).toHaveURL(/\/linktree$/)
  await page.reload()
  await expect(page.getByText('Welcome! You are now logged in.')).toHaveCount(0)
})
test('navigation follows content links, renders 404, and serves app assets', async ({
  page,
  request,
}) => {
  await page.goto('/linktree', { waitUntil: 'networkidle' })
  const mark = await page.locator('link[rel=icon]').getAttribute('href')
  const asset = await request.get(mark!)
  expect(asset.status()).toBe(200)
  expect(asset.headers()['content-type']).toMatch(/image\/svg/)
  const link = page.locator('footer a[href^="/"]:not([href="/"])').first()
  const destination = new URL((await link.getAttribute('href'))!, page.url()).pathname
  await link.click()
  await expect(page).toHaveURL((url) => url.pathname === destination)
  await expect(page.locator('main')).not.toBeEmpty()
  const response = await page.goto('/missing-migrated-route')
  expect(response?.status()).toBe(404)
  expect(response?.headers()['cache-control']).toBe('no-store')
  await expect(page.locator('main')).not.toBeEmpty()
})

test('Amazon Music logos preserve the open letter shapes with sizing styles', async ({ page }) => {
  for (const path of ['/linktree', '/halbkreis']) {
    await page.goto(path)
    const logo = page.locator('main svg[aria-label="Amazon Music"]')
    await expect(logo).toBeVisible()
    const filled = await logo
      .locator('path')
      .nth(5)
      .evaluate((letter: SVGPathElement) => letter.isPointInFill(new DOMPoint(12, 32)))
    expect(filled, `The hole in Amazon’s first “a” must remain open on ${path}`).toBe(false)
  }
})

test('SoundCloud artwork stays visible with repeated logos and a closed navigation dialog', async ({
  page,
}) => {
  await page.goto('/resolve-yourself')

  async function expectArtwork(logo: Locator) {
    await expect(logo).toBeVisible()
    await logo.evaluate((svg: SVGElement) => {
      Object.assign(svg.style, {
        width: '250px',
        height: '30px',
        maxWidth: 'none',
        color: '#fff',
        background: '#000',
      })
    })
    const { data, info } = await sharp(await logo.screenshot())
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const filledRows = Array.from({ length: info.height - 2 }, (_, row) => {
      const y = row + 1
      let filled = 0
      for (let x = 0; x < info.width; x++) {
        if (data[y * info.width + x] > 128) filled++
      }
      return filled / info.width
    })
    const fullestRow = Math.max(...filledRows)
    expect(fullestRow, 'The artwork must paint visible cloud and letter shapes').toBeGreaterThan(
      0.2,
    )
    expect(fullestRow, 'The logo must not paint a solid rectangular bar').toBeLessThan(0.9)
  }

  await expectArtwork(page.locator('main svg[aria-label="SoundCloud"]'))
  await expectArtwork(page.locator('footer a[aria-label="SoundCloud"] svg'))
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expectArtwork(page.getByRole('dialog').locator('a[aria-label="SoundCloud"] svg'))
})

for (const width of [360, 1280]) {
  test(`lower sidebar retains the newsletter card and compact logo rows at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 600 })
    await page.goto('/halbkreis', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const newsletter = dialog.getByRole('region', { name: 'Newsletter', exact: true })
    await expect(newsletter).toBeVisible()
    const card = await newsletter.evaluate((el) => ({
      border: parseFloat(getComputedStyle(el).borderTopWidth),
      radius: parseFloat(getComputedStyle(el).borderTopLeftRadius),
      icons: el.querySelectorAll('li svg').length,
    }))
    expect(card.border).toBeGreaterThanOrEqual(1)
    expect(card.radius).toBe(12)
    expect(card.icons).toBe(2)
    const email = newsletter.getByRole('textbox', { name: 'Email address' })
    await expect(email).toBeEnabled()
    const menu = dialog.locator('.navigation-menu')
    await menu.hover({ position: { x: 20, y: 200 } })
    await page.mouse.wheel(0, 2000)
    await expect.poll(() => menu.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    await email.scrollIntoViewIfNeeded()
    const input = (await email.boundingBox())!
    expect(input.y).toBeGreaterThanOrEqual(0)
    expect(input.y + input.height).toBeLessThanOrEqual(600)
    expect(await dialog.evaluate((el) => el.scrollLeft)).toBe(0)
    const gap = await newsletter.evaluate((el) => {
      const input = el.querySelector('input[type=email]')!.getBoundingClientRect()
      const button = el.querySelector('button[type=submit]')!.getBoundingClientRect()
      return button.left - input.right
    })
    expect(Math.abs(gap)).toBeLessThanOrEqual(1)
    const music = dialog.getByRole('list', { name: 'Find my music' })
    expect(await music.evaluate((el) => getComputedStyle(el).rowGap)).toBe('0px')
    const spotify = await music.getByRole('link', { name: 'Spotify', exact: true }).boundingBox()
    const amazon = await music
      .getByRole('link', { name: 'Amazon Music', exact: true })
      .boundingBox()
    expect(amazon!.y - spotify!.y).toBeLessThanOrEqual(48)
  })
}

for (const width of [360, 1280, 2732]) {
  test(`portrait text blocks overlap their headlines at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/one-week-album')
    const cards = page.locator('main div:has(> div > img) + :is(div, section):has(> h2)')
    expect(await cards.count()).toBeGreaterThan(0)
    for (const card of await cards.all()) {
      const portrait = card.locator('xpath=preceding-sibling::div[1]//img')
      await portrait.scrollIntoViewIfNeeded()
      await portrait.evaluate((img: HTMLImageElement) => img.decode())
      const image = await portrait.boundingBox()
      const heading = await card.locator(':scope > h2').boundingBox()
      const box = await card.boundingBox()
      expect(image!.width).toBeGreaterThan(250)
      const overlap = image!.y + image!.height - heading!.y
      expect(overlap).toBeGreaterThanOrEqual(20)
      expect(overlap).toBeLessThanOrEqual(28)
      expect(Math.abs(image!.x + image!.width / 2 - box!.x - box!.width / 2)).toBeLessThan(2)
    }
  })
}

test('outside clicks close overlays and local menu navigation adds no menu history entry', async ({
  page,
}) => {
  await page.goto('/halbkreis', { waitUntil: 'networkidle' })
  const title = await page.locator('main h1').textContent()
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.mouse.click(20, 400)
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page).toHaveURL(/\/halbkreis$/)
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const link = dialog.locator('details').first().getByRole('link').first()
  const destination = new URL((await link.getAttribute('href'))!, page.url()).pathname
  await link.click()
  await expect(page).toHaveURL((url) => url.pathname === destination)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL(/\/halbkreis$/)
  await expect(page.locator('main h1')).toHaveText(title!)
  expect((await page.goto('/nav'))?.status()).toBe(404)
})

test('sidebar keeps the original header and menu item spacing with SVG controls', async ({
  page,
}) => {
  await page.goto('/halbkreis', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const close = dialog.getByRole('button', { name: 'Close navigation' })
  await expect(close.locator('svg')).toBeVisible()
  expect((await close.locator('..').boundingBox())!.height).toBe(32)
  const work = dialog.locator('summary').filter({ hasText: 'Work' })
  await expect(work.locator('svg')).toBeVisible()
  const links = dialog.locator('details').first().getByRole('link')
  const first = await links.nth(0).boundingBox()
  const second = await links.nth(1).boundingBox()
  expect(second!.y - first!.y - first!.height).toBe(4)
})

test('sidebar slide and backdrop share the opening timeline on every open', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/halbkreis', { waitUntil: 'networkidle' })
  const dialog = page.getByRole('dialog', { name: 'Navigation', exact: true })

  for (let opening = 0; opening < 2; opening++) {
    await page.evaluate(() => {
      ;(window as any).navigationOpening = new Promise((resolve) => {
        document.addEventListener(
          'click',
          () => {
            requestAnimationFrame(async () => {
              const dialog = document.querySelector<HTMLDialogElement>('#site-navigation')!
              const panel = dialog.querySelector<HTMLElement>('[data-navigation-panel]')!
              const animations = dialog.getAnimations({ subtree: true })
              const slide = animations.find((animation) => {
                const effect = animation.effect as KeyframeEffect
                return effect.target === panel && effect.getKeyframes().some((key) => key.transform)
              })
              const backdrop = animations.find((animation) => {
                const effect = animation.effect as KeyframeEffect
                return effect.target === dialog && effect.getKeyframes().some((key) => key.opacity)
              })
              if (!slide || !backdrop) {
                resolve({ slide: Boolean(slide), backdrop: Boolean(backdrop) })
                return
              }
              await Promise.all([slide.ready, backdrop.ready])
              const startTimes = [slide.startTime, backdrop.startTime]
              const timing = [slide.effect!.getTiming(), backdrop.effect!.getTiming()]
              slide.pause()
              backdrop.pause()
              const samples = [0, 0.25, 0.5, 0.75, 1].map((progress) => {
                slide.currentTime = Number(timing[0].duration) * progress
                backdrop.currentTime = Number(timing[1].duration) * progress
                return {
                  right: panel.getBoundingClientRect().right,
                  opacity: Number(getComputedStyle(dialog, '::backdrop').opacity),
                  scrollLeft: dialog.scrollLeft,
                }
              })
              slide.finish()
              backdrop.finish()
              resolve({
                slide: true,
                backdrop: true,
                startTimes,
                durations: timing.map((value) => value.duration),
                easing: [slide, backdrop].map((animation, index) =>
                  timing[index].easing === 'linear'
                    ? (animation.effect as KeyframeEffect).getKeyframes()[0].easing
                    : timing[index].easing,
                ),
                width: panel.getBoundingClientRect().width,
                viewport: innerWidth,
                samples,
              })
            })
          },
          { capture: true, once: true },
        )
      })
    })
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const motion = await page.evaluate(() => (window as any).navigationOpening)
    expect(motion).toMatchObject({ slide: true, backdrop: true })
    expect(motion.durations).toEqual([300, 300])
    expect(motion.easing).toEqual(['ease-in-out', 'ease-in-out'])
    expect(Math.abs(motion.startTimes[0] - motion.startTimes[1])).toBeLessThan(1)
    expect(motion.samples[0].opacity).toBe(0)
    expect(motion.samples.at(-1).opacity).toBe(1)
    for (const [index, sample] of motion.samples.entries()) {
      expect(sample.scrollLeft).toBe(0)
      expect(sample.opacity).toBeGreaterThanOrEqual(0)
      expect(sample.opacity).toBeLessThanOrEqual(1)
      expect(sample.right).toBeGreaterThanOrEqual(motion.viewport)
      expect(sample.right).toBeLessThanOrEqual(motion.viewport + motion.width)
      expect(sample.right - motion.viewport).toBeCloseTo(motion.width * (1 - sample.opacity), 0)
      if (index > 0) {
        expect(sample.opacity).toBeGreaterThanOrEqual(motion.samples[index - 1].opacity)
        expect(sample.right).toBeLessThanOrEqual(motion.samples[index - 1].right)
      }
    }
    await dialog.getByRole('button', { name: 'Close navigation' }).click()
    await expect(dialog).not.toBeVisible()
  }
})

test('sidebar sections animate open and closed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/halbkreis', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const work = dialog.locator('details').first()
  const expanded = (await work.boundingBox())!.height
  await work.locator('summary').click()
  await expect
    .poll(async () => {
      const height = (await work.boundingBox())!.height
      return height > 50 && height < expanded - 1
    })
    .toBe(true)
  await expect.poll(async () => (await work.boundingBox())!.height).toBeLessThan(expanded)
  await expect(dialog.locator('details').first().getByRole('link').first()).not.toBeVisible()
  await work.locator('summary').click()
  await expect
    .poll(async () => {
      const height = (await work.boundingBox())!.height
      return height > 50 && height < expanded - 1
    })
    .toBe(true)
  await expect(dialog.locator('details').first().getByRole('link').first()).toBeVisible()
  await dialog.getByRole('button', { name: 'Close navigation' }).click()
  await expect(dialog).not.toBeVisible()
})

test('sidebar respects reduced motion and keyboard disclosure controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/halbkreis', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const panel = dialog.locator('[data-navigation-panel]')
  await expect(panel).toBeVisible()
  expect(await panel.evaluate((el) => el.getAnimations().length)).toBe(0)
  const summary = dialog.locator('summary').filter({ hasText: 'Work' })
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(dialog.locator('details').first().getByRole('link').first()).not.toBeVisible()
  await page.keyboard.press('Space')
  await expect(dialog.locator('details').first().getByRole('link').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`sidebar keyboard focus uses the original visible outline in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
    await page.goto('/halbkreis', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const themeColor = await page.locator('body').evaluate((el) => getComputedStyle(el).color)
    await expect(dialog.getByRole('textbox', { name: 'Email address' })).toBeEnabled()
    await page.keyboard.press('Tab')
    for (const control of [
      dialog.getByRole('button', { name: 'Close navigation' }),
      dialog.locator('summary').filter({ hasText: 'Work' }),
      dialog.locator('details').first().getByRole('link').first(),
      dialog.getByRole('button', { name: 'Signup' }),
      dialog.getByRole('link', { name: 'Twitch', exact: true }),
      dialog.getByRole('link', { name: 'Spotify', exact: true }),
    ]) {
      await control.focus()
      await expect
        .poll(() =>
          control.evaluate((el) => {
            const style = getComputedStyle(el)
            return {
              visible: el.matches(':focus-visible'),
              width: style.outlineWidth,
              offset: style.outlineOffset,
              color: style.outlineColor,
            }
          }),
        )
        .toEqual({ visible: true, width: '4px', offset: '4px', color: themeColor })
    }
    const email = dialog.getByRole('textbox', { name: 'Email address' })
    await email.focus()
    await expect
      .poll(() =>
        email.evaluate((el) => ({
          visible: el.matches(':focus-visible'),
          outline: getComputedStyle(el).outlineStyle,
          shadow: getComputedStyle(el).boxShadow,
        })),
      )
      .toEqual({
        visible: true,
        outline: 'none',
        shadow: `${themeColor} 0px 0px 0px 1px inset`,
      })
    expect(
      await dialog
        .locator('details[open]')
        .evaluate((el) => getComputedStyle(el, '::details-content').overflow),
    ).toBe('visible')
  })
}
