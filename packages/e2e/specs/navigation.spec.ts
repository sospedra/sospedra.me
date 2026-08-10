import { expect, expectClean, test } from '../fixtures'

test.describe('navigation contract', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop flow')

  test('browser back from bazaar lands home cleanly', async ({
    page,
    health,
  }) => {
    await page.goto('/')
    const doorway = page.locator('a[href="/bazaar"]').first()
    await doorway.click()
    await page.waitForURL('**/bazaar', { timeout: 30_000 })

    await page.goBack()
    await page.waitForURL(/localhost:3000\/$/, { timeout: 30_000 })
    await expect(page.locator('a[href="/bazaar"]').first()).toBeVisible()
    expectClean(health)
  })
})
