import { expect, test } from '@playwright/test'

test('Temple reserves breathing room below the date across opener faces and window sizes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/temple-of-sound')
  await expect(page.locator('.temple-artwork')).toHaveAttribute('data-state', 'ready')

  // Resize the same mounted scene, including changes between orientations.
  for (const [width, height] of [
    [1510, 446],
    [3020, 892],
    [2048, 605],
    [1280, 320],
    [844, 390],
    [1440, 900],
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    for (const fraction of [0, 0.05, 0.1, 0.15]) {
      await page.evaluate(async (fraction) => {
        scrollTo(0, innerHeight * fraction)
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )
      }, fraction)
      await expect
        .poll(
          async () =>
            page.evaluate(() => {
              const canvas = document.querySelector<HTMLCanvasElement>('.temple-stage > canvas')!
              const date = document.querySelector('.temple-date')!.getBoundingClientRect()
              const bounds = canvas.getBoundingClientRect()
              const { data } = canvas
                .getContext('2d')!
                .getImageData(0, 0, canvas.width, canvas.height)
              const first = data.findIndex((value, index) => index % 4 === 3 && value > 16)
              if (first < 0) return -Infinity
              const top = Math.floor(first / 4 / canvas.width) * (bounds.height / canvas.height)
              return top + bounds.top - date.bottom
            }),
          { message: `date clearance at ${width}×${height}, scroll ${fraction}` },
        )
        .toBeGreaterThanOrEqual(16)
    }
  }
})
