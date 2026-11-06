import { expect, test, type BrowserContext, type Route } from '@playwright/test'

async function formData(route: Route) {
  return new Response(new Uint8Array(route.request().postDataBuffer()!), {
    headers: await route.request().allHeaders(),
  }).formData()
}

async function sessionServer(context: BrowserContext) {
  let sessions = 0
  let rejected = 0
  let delivered = 0
  let currentToken = 'fixture-token-1'
  let email: string | undefined
  let nameRequired = false
  let failure: { status: number; reason?: string } | undefined
  let startupHeld: Promise<void> | undefined
  let releaseStartup: (() => void) | undefined
  const posts: {
    path: string
    token: string
    intent: string | null
    email: string | null
    name: string | null
  }[] = []
  await context.route(/\/(login|circle|newsletter\/temple)$/, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const cookieHeader = (await request.allHeaders()).cookie
    // WebKit attaches Cookie after request interception. Its intercepted mock
    // response therefore needs the browser's URL-scoped cookie jar instead.
    const cookie =
      cookieHeader !== undefined
        ? cookieHeader.match(/fixture_session=([^;]+)/)?.[1]
        : (await context.cookies(request.url())).find((cookie) => cookie.name === 'fixture_session')
            ?.value
    const session = cookie ?? `session-${++sessions}`
    const csrfToken = session === 'session-1' ? currentToken : `${session}-token`
    const headers: Record<string, string> = cookie
      ? {}
      : { 'Set-Cookie': `fixture_session=${session}; Path=/; HttpOnly` }
    if (request.method() === 'GET') {
      // Hold the first cookie response long enough for independent islands to
      // start their state requests while the browser is still anonymous.
      if (!cookie) await (startupHeld ?? new Promise((resolve) => setTimeout(resolve, 80)))
      return route.fulfill({
        headers,
        json: {
          ready: true,
          csrfToken,
          ...(email ? { email, name: 'Fixture member' } : {}),
          ...(path === '/circle' ? { places: [] } : {}),
        },
      })
    }
    const body = await formData(route)
    const token = String(body.get('_csrf'))
    posts.push({
      path,
      token,
      intent: body.get('intent') as string | null,
      email: body.get('email') as string | null,
      name: body.get('name') as string | null,
    })
    if (failure)
      return route.fulfill({
        status: failure.status,
        headers: failure.reason ? { 'X-Hdm-Csrf-Rejected': failure.reason } : {},
        json: { type: 'error', message: 'Something went wrong. Please try again.' },
      })
    if (token !== csrfToken) {
      rejected++
      return route.fulfill({
        status: 403,
        headers: { 'X-Hdm-Csrf-Rejected': 'invalid-token' },
        json: { type: 'error', message: 'Something went wrong. Please try again.' },
      })
    }
    if (nameRequired && !body.get('name'))
      return route.fulfill({
        json: {
          type: 'success',
          message: 'Please enter your name.',
          nameRequired: true,
          csrfToken,
        },
      })
    delivered++
    return route.fulfill({
      json: { type: 'success', message: 'Synthetic sent.', confirmationPending: true, csrfToken },
    })
  })
  return {
    get sessions() {
      return sessions
    },
    get rejected() {
      return rejected
    },
    get delivered() {
      return delivered
    },
    posts,
    holdStartup() {
      startupHeld = new Promise((resolve) => {
        releaseStartup = resolve
      })
    },
    releaseStartup() {
      releaseStartup?.()
    },
    requireName() {
      nameRequired = true
    },
    fail(status: number, reason?: string) {
      failure = { status, reason }
    },
    rotate(identity?: string) {
      currentToken = 'fixture-rotated-token'
      email = identity
    },
  }
}

for (const locks of [true, false]) {
  test(`fresh Watch, Circle and sidebar share one session${locks ? '' : ' without Web Locks'}`, async ({
    page,
    context,
  }) => {
    if (!locks)
      await page.addInitScript(() =>
        Object.defineProperty(navigator, 'locks', { value: undefined }),
      )
    const server = await sessionServer(context)
    await page.goto('/temple-session')
    const watch = page.locator('#fixture-watch .temple-signup')
    const circle = page.locator('#fixture-share')
    await expect(circle.getByRole('button', { name: 'Fixture claim' })).toBeEnabled()
    await watch.getByRole('link', { name: 'Fixture pending action' }).click()
    await expect(watch.getByLabel('Email address')).toBeEnabled()
    expect(server.sessions).toBe(1)
    await watch.getByLabel('Email address').fill('watch@example.org')
    await watch.getByRole('button', { name: 'Fixture pending action' }).click()
    await expect(watch.getByRole('status')).toHaveText('Synthetic sent.')
    await circle.getByRole('button', { name: 'Fixture claim' }).click()
    await circle.getByLabel('Email address').fill('circle@example.org')
    await circle.getByRole('button', { name: 'Request login email' }).click()
    await expect(circle.getByRole('status')).toBeVisible()
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const menu = page.getByRole('dialog', { name: 'Navigation', exact: true })
    await menu.getByLabel('Email address').fill('sidebar@example.org')
    await menu.getByRole('button', { name: 'Signup', exact: true }).click()
    await expect(menu.getByRole('status')).toHaveText('Synthetic sent.')
    expect(server.sessions).toBe(1)
    expect(server.rejected).toBe(0)
    expect(server.delivered).toBe(3)
  })
}

test('fresh tabs coordinate cookie creation through the browser lock', async ({ context }) => {
  const server = await sessionServer(context)
  server.holdStartup()
  const pages = await Promise.all([context.newPage(), context.newPage()])
  try {
    await Promise.all(pages.map((page) => page.goto('/temple-session')))
    for (const page of pages)
      await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    expect(server.sessions).toBe(1)
  } finally {
    server.releaseStartup()
  }
  for (const page of pages) {
    await expect(page.getByRole('button', { name: 'Fixture claim' })).toBeEnabled()
    const watch = page.locator('#fixture-watch .temple-signup')
    await watch.getByRole('link', { name: 'Fixture pending action' }).click()
    await expect(watch.getByLabel('Email address')).toBeEnabled()
  }
  expect(server.sessions).toBe(1)
})

test('aborting one island refresh cannot abort the shared session startup', async ({
  page,
  context,
}) => {
  const server = await sessionServer(context)
  server.holdStartup()
  try {
    await page.goto('/temple-session', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => server.sessions).toBe(1)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  } finally {
    server.releaseStartup()
  }
  await expect(page.getByRole('button', { name: 'Fixture claim' })).toBeEnabled()
  const watch = page.locator('#fixture-watch .temple-signup')
  await watch.getByRole('link', { name: 'Fixture pending action' }).click()
  await expect(watch.getByLabel('Email address')).toBeEnabled()
  expect(server.sessions).toBe(1)
})

for (const path of ['/newsletter/temple', '/circle', '/login']) {
  test(`stale token recovers once without losing fields at ${path}`, async ({ page, context }) => {
    const server = await sessionServer(context)
    await page.goto(
      path === '/circle'
        ? '/temple-circle'
        : path === '/login'
          ? '/fixture-release'
          : '/temple-facts',
    )
    if (path === '/circle') await page.getByRole('button', { name: 'Fixture claim' }).click()
    else if (path === '/login')
      await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    else await page.getByRole('link', { name: 'Fixture pending action' }).click()
    const panel =
      path === '/login'
        ? page.getByRole('dialog', { name: 'Navigation', exact: true })
        : page.locator('.temple-signup-expanded')
    await panel.getByLabel('Email address').fill('fixture@example.org')
    const submit = panel.getByRole('button', {
      name:
        path === '/circle'
          ? 'Request login email'
          : path === '/login'
            ? 'Signup'
            : 'Fixture pending action',
      exact: true,
    })
    server.requireName()
    await submit.click()
    await panel.getByLabel('Name', { exact: true }).fill('Synthetic private name')
    server.rotate()
    await submit.click()
    await expect.poll(() => server.delivered).toBe(1)
    expect(server.rejected).toBe(1)
    expect(server.posts).toHaveLength(3)
    expect(server.posts[2]).toEqual({ ...server.posts[1], token: 'fixture-rotated-token' })
    expect(server.posts[2].name).toBe('Synthetic private name')
  })
}

test('an ambiguous network failure is not replayed', async ({ page, context }) => {
  const server = await sessionServer(context)
  let attempts = 0
  await page.route('**/newsletter/temple', (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    attempts++
    return route.abort('failed')
  })
  await page.goto('/temple-facts')
  await page.getByRole('link', { name: 'Fixture pending action' }).click()
  const panel = page.locator('.temple-signup-expanded')
  await panel.getByLabel('Email address').fill('fixture@example.org')
  await panel.getByRole('button', { name: 'Fixture pending action', exact: true }).click()
  await expect(panel.getByRole('alert')).toBeVisible()
  expect(attempts).toBe(1)
  expect(server.delivered).toBe(0)
  await expect(panel.getByLabel('Email address')).toHaveValue('fixture@example.org')
})

for (const [status, reason, attempts] of [
  [403, undefined, 1],
  [403, 'invalid-origin', 1],
  [403, 'invalid-token', 2],
  [403, 'missing-token', 2],
  [429, undefined, 1],
  [503, undefined, 1],
] as const) {
  test(`submission bounds retries for ${status}/${reason ?? 'unmarked'}`, async ({
    page,
    context,
  }) => {
    const server = await sessionServer(context)
    await page.goto('/temple-facts')
    await page.getByRole('link', { name: 'Fixture pending action' }).click()
    const panel = page.locator('.temple-signup-expanded')
    await panel.getByLabel('Email address').fill('fixture@example.org')
    server.fail(status, reason)
    await panel.getByRole('button', { name: 'Fixture pending action', exact: true }).click()
    await expect(panel.getByRole('alert')).toBeVisible()
    expect(server.posts).toHaveLength(attempts)
    expect(server.delivered).toBe(0)
    await expect(panel.getByLabel('Email address')).toHaveValue('fixture@example.org')
  })
}

for (const path of ['/newsletter/temple', '/circle', '/login']) {
  test(`identity change refreshes the form without replaying ${path}`, async ({
    page,
    context,
  }) => {
    const server = await sessionServer(context)
    await page.goto(
      path === '/circle'
        ? '/temple-circle'
        : path === '/login'
          ? '/fixture-release'
          : '/temple-facts',
    )
    if (path === '/circle') await page.getByRole('button', { name: 'Fixture claim' }).click()
    else if (path === '/login')
      await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    else await page.getByRole('link', { name: 'Fixture pending action' }).click()
    const panel =
      path === '/login'
        ? page.getByRole('dialog', { name: 'Navigation', exact: true })
        : page.locator('.temple-signup-expanded')
    await panel.getByLabel('Email address').fill('fixture@example.org')
    server.rotate('other@example.org')
    await panel
      .getByRole('button', {
        name:
          path === '/circle'
            ? 'Request login email'
            : path === '/login'
              ? 'Signup'
              : 'Fixture pending action',
        exact: true,
      })
      .click()
    if (path === '/circle') await expect(panel.getByLabel('Name or Alias')).toBeVisible()
    else if (path === '/login') await expect(panel.locator('.newsletter-user')).toBeVisible()
    else await expect(panel.getByLabel('Email address')).toHaveCount(0)
    expect(server.posts).toHaveLength(1)
    expect(server.delivered).toBe(0)
  })
}
