import { expect, test } from '@playwright/test'
import assets from '../../.generated/assets.json' with { type: 'json' }
import { waitForApplication } from '../qa/browser.ts'

test('login QA waits for a delayed form module before submitting', async ({ page }) => {
  let release!: () => void
  const moduleReady = new Promise<void>((resolve) => {
    release = resolve
  })
  let requested = false
  await page.route(`**${assets.newsletter}`, async (route) => {
    requested = true
    await moduleReady
    await route.continue()
  })
  let submitted = false
  await page.route('**/login', async (route) => {
    expect(route.request().headers().accept).toContain('application/json')
    const fields = await new Response(new Uint8Array(route.request().postDataBuffer()!), {
      headers: route.request().headers(),
    }).formData()
    expect(fields.get('email')).toBe('listener@example.org')
    submitted = true
    await route.fulfill({ json: { type: 'success', message: 'Synthetic confirmation sent.' } })
  })
  try {
    await page.goto('/fixture-login', { waitUntil: 'load' })
    await expect.poll(() => requested).toBe(true)
    const ready = waitForApplication(page)
    expect(await Promise.race([ready.then(() => 'ready'), page.evaluate(() => 'pending')])).toBe(
      'pending',
    )
    expect(submitted).toBe(false)
    release()
    await ready
    const form = page.locator('form[action="/login"]')
    await form.getByLabel('Email address').fill('listener@example.org')
    await form.getByRole('button', { name: 'Get Login Link', exact: true }).click()
    await expect(form.getByRole('status')).toHaveText('Synthetic confirmation sent.')
    expect(submitted).toBe(true)
  } finally {
    release()
  }
})
