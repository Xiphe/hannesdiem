import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

// Manual artwork capture, not a test fixture. Use a running authored-content preview.
const url = process.argv[2] ?? 'http://127.0.0.1:8787/temple-of-sound'
const output = resolve(process.argv[3] ?? 'content/media/temple-share-opener.png')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'en',
  })
  // This capture-only seed puts OF and SOUND before TEMPLE in the native
  // transition order. At 16px, TEMPLE still has its original Bricolage face.
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto)
    crypto.getRandomValues = (array) => {
      const result = random(array)
      if (array instanceof Uint32Array && array.length === 1) array[0] = 0
      return result
    }
  })
  await page.goto(url)
  await page.locator('.temple-opening[data-ready]').waitFor({ timeout: 20000 })
  // Let actual forest particles escape through the type before capturing them.
  await page.waitForTimeout(1500)
  // Freeze an early scroll transition with another native face already entering.
  await page.evaluate(() => window.scrollTo(0, 16))
  await page.mouse.move(850, 430)
  await page.waitForTimeout(200)
  let best = { score: -1, data: '' }
  for (let sample = 0; sample < 24; sample++) {
    await page.waitForTimeout(150)
    const candidate = await page.evaluate(() => {
      const title = document.querySelector<HTMLCanvasElement>('.temple-stage > canvas')!
      const foreground = document.querySelector<HTMLCanvasElement>('.temple-escapes')!
      const frame = document.createElement('canvas')
      frame.width = 1200
      frame.height = 630
      const ink = frame.getContext('2d')!
      ink.drawImage(title, 0, 0, frame.width, frame.height)
      ink.globalCompositeOperation = 'screen'
      // Lift the real foreground lights a little for a small messaging preview.
      ink.drawImage(foreground, 0, 0, frame.width, frame.height)
      ink.drawImage(foreground, 0, 0, frame.width, frame.height)
      const light = foreground
        .getContext('2d')!
        .getImageData(0, 0, foreground.width, foreground.height).data
      const letters = title.getContext('2d')!.getImageData(0, 0, title.width, title.height).data
      let score = 0
      for (let pixel = 3; pixel < light.length; pixel += 4)
        if (letters[pixel] < 20 && light[pixel] > 30) score += light[pixel]
      return { score, data: frame.toDataURL('image/png') }
    })
    if (candidate.score > best.score) best = candidate
  }
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, Buffer.from(best.data.split(',')[1], 'base64'))
  console.log(output, `(foreground selection score: ${best.score})`)
} finally {
  await browser.close()
}
