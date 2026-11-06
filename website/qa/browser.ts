import type { Page } from '@playwright/test'

export async function waitForApplication(page: Page) {
  await page.evaluate(async () => {
    const entry = document.querySelector<HTMLScriptElement>('script[type="module"][src]')
    if (!entry) throw new Error('QA application entry is missing')
    // The existing entry awaits app.ready(). Importing the same module waits for
    // hydration without starting a second application or relying on network idle.
    await import(entry.src)
  })
}
