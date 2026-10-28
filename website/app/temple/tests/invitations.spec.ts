import { expect, test } from '@playwright/test'

test('invitation details open and close without re-rendering authored content', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/fixture-invitations')
  const trigger = page.getByRole('button', { name: 'Open fixture details' })
  const dialog = page.getByRole('dialog', { name: 'Fixture details' })
  await page.evaluate(() => {
    const card = document.querySelector('#fixture-invitation')!
    Object.assign(window, { originalInvitation: card, invitationMutations: 0 })
    new MutationObserver((records) => {
      ;(window as any).invitationMutations += records.length
    }).observe(card, { subtree: true, childList: true, attributes: true, characterData: true })
  })
  await trigger.click()
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Static dialog explanation.')
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  expect(
    await page.evaluate(() => ({
      same: (window as any).originalInvitation === document.querySelector('#fixture-invitation'),
      mutations: (window as any).invitationMutations,
    })),
  ).toEqual({ same: true, mutations: 0 })
  await trigger.click()
  await dialog.getByRole('link', { name: 'Return to fixture' }).click()
  await expect(page).toHaveURL(/\/fixture$/)
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('invitation cards and details fit a phone with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/fixture-invitations')
  await page.getByRole('button', { name: 'Open fixture details' }).click()
  const dialog = page.getByRole('dialog', { name: 'Fixture details' })
  await expect(dialog).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  const rect = await dialog.boundingBox()
  expect(rect!.x).toBeGreaterThanOrEqual(0)
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(390)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})
