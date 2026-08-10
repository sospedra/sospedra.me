import { expect, expectClean, test } from '../fixtures'

test.describe('console', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop flow')

  test('help prints new output', async ({ page, health }) => {
    await page.goto('/console')

    const input = page.getByLabel('Terminal input. Type help for commands')
    await input.click()
    const before = ((await page.locator('body').textContent()) ?? '').length

    await input.fill('help')
    await page.keyboard.press('Enter')

    await expect
      .poll(
        async () =>
          ((await page.locator('body').textContent()) ?? '').length,
      )
      .toBeGreaterThan(before + 40)

    expectClean(health)
  })
})
