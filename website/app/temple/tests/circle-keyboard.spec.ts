import { expect, test } from '@playwright/test'

for (const seatTop of [120, 700]) {
  test(`circle signup stays in a panned visual viewport with the seat at ${seatTop}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('**/circle', (route) =>
      route.fulfill({ json: { ready: true, csrfToken: 'fixture-csrf', places: [] } }),
    )
    await page.goto('/temple-circle')
    const seat = page.locator('#fixture-reservation input[value="1"]')
    await seat.click()
    const dialog = page.getByRole('dialog', { name: 'Take your place', exact: true })
    await expect(dialog).toBeVisible()
    await page.evaluate((seatTop) => {
      const spacer = document.createElement('div')
      spacer.style.height = '2000px'
      document.body.appendChild(spacer)
      const seat = document.querySelector('#fixture-reservation input[value="1"]')!
      scrollBy(0, seat.getBoundingClientRect().top - seatTop)
      const viewport = window.visualViewport!
      for (const [key, value] of Object.entries({ offsetTop: 240, height: 420 }))
        Object.defineProperty(viewport, key, { configurable: true, value })
      viewport.dispatchEvent(new Event('resize'))
      viewport.dispatchEvent(new Event('scroll'))
    }, seatTop)
    await expect.poll(async () => (await dialog.boundingBox())!.y).toBeGreaterThanOrEqual(252)
    await expect
      .poll(async () => {
        const panel = (await dialog.boundingBox())!
        return panel.y + panel.height
      })
      .toBeLessThanOrEqual(648)
    await expect(dialog.getByRole('button', { name: 'Close signup' })).toBeInViewport()
  })
}
