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
  await page.goto(url)
  await page.locator('.temple-opening[data-ready]').waitFor({ timeout: 20000 })
  await page.mouse.move(850, 430)
  await page.waitForTimeout(100)
  const data = await page
    .locator('.temple-stage > canvas')
    .evaluate((canvas) => canvas.toDataURL('image/png'))
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, Buffer.from(data.split(',')[1], 'base64'))
  console.log(output)
} finally {
  await browser.close()
}
