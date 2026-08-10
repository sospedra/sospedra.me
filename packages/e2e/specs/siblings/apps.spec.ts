import { expect, expectClean, test } from '../../fixtures'

const APPS = [
  { name: 'bonfire', url: 'http://localhost:3010/' },
  { name: 'wkc', url: 'http://localhost:5173/' },
  { name: 'spg', url: 'http://localhost:5174/' },
] as const

for (const app of APPS) {
  test(`${app.name} renders clean`, async ({ page, health }) => {
    await page.goto(app.url)
    await expect(page.locator('body')).not.toBeEmpty()
    await page.waitForTimeout(2000)
    expectClean(health)
  })
}
