import { expect, expectClean, test } from '../fixtures'
import { MAIN_ROUTES } from '../routes'

for (const route of MAIN_ROUTES) {
  test(`${route} renders clean`, async ({ page, health }) => {
    await page.goto(route)
    await expect(page.locator('body')).not.toBeEmpty()
    await page.waitForTimeout(2000)
    expectClean(health)
  })
}

test('/recycle-bin stays a designed 404', async ({ page }) => {
  const response = await page.goto('/recycle-bin')
  expect(response?.status()).toBe(404)
})
