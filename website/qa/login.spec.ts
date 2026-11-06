import { expect, test } from '@playwright/test'
import { openGmailInbox, readGmailCredentials } from './gmail.ts'

test('real email login survives navigation and logout clears the session', async ({
  browser,
  baseURL,
}) => {
  // Own and close this context before reporting failures so Playwright cannot
  // include real email links or private form state in its error-page snapshots.
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  let stage = 'Gmail access'
  try {
    const credentials = readGmailCredentials()
    const inbox = await openGmailInbox(credentials)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.name))
    stage = 'login form'
    expect((await page.goto('/login', { waitUntil: 'load' }))?.ok()).toBe(true)
    const form = page.locator('form[action="/login"]')
    await form.getByLabel('Email address').fill(credentials.email)
    const since = Date.now()
    async function submit() {
      const response = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/login' && response.request().method() === 'POST',
      )
      await form.getByRole('button', { name: 'Get Login Link', exact: true }).click()
      const result = await response
      expect(result.ok()).toBe(true)
      return (await result.json()) as { type: string; nameRequired?: boolean }
    }
    let result = await submit()
    if (result.nameRequired) {
      await form.getByLabel('Name', { exact: true }).fill(credentials.name)
      result = await submit()
    }
    expect(result.type).toBe('success')
    expect(Boolean(result.nameRequired)).toBe(false)
    stage = 'email delivery'
    const login = await inbox.waitForLogin(new URL(baseURL!).origin, since)
    stage = 'emailed login link'
    expect((await page.goto(login.link, { waitUntil: 'load' }))?.ok()).toBe(true)
    // Chrome consumes login_success when it shows the welcome notice. Verify the
    // persisted identity instead of racing that transient query parameter.
    stage = 'initial session'
    const session = () =>
      page.evaluate(async () => {
        const response = await fetch('/login', { headers: { Accept: 'application/json' } })
        if (!response.ok) throw new Error('QA session request failed')
        return (await response.json()) as { email?: string }
      })
    expect((await session()).email === credentials.email).toBe(true)
    stage = 'session persistence'
    await page.goto('/temple-of-sound', { waitUntil: 'load' })
    await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')
    expect((await session()).email === credentials.email).toBe(true)
    stage = 'logout'
    await page.goto('/temple-of-sound/visit', { waitUntil: 'load' })
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Navigation', exact: true })
      .getByRole('button', { name: 'Logout', exact: true })
      .click()
    await expect.poll(async () => (await session()).email === undefined).toBe(true)
    expect(errors).toEqual([])
    stage = 'mail archiving'
    await login.archive()
  } catch {
    // Never propagate Playwright call logs containing the emailed token or values.
    throw new Error(`Authenticated QA failed during ${stage}`)
  } finally {
    await context.close()
  }
})
