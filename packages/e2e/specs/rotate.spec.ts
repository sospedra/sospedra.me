import { expect, test } from '../fixtures'

test.describe('rotate mid-game', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only flow')

  test('crossword controls answer after an orientation swap', async ({
    page,
  }) => {
    await page.goto('/crosswords')
    await page.locator('#crossword-start-key').tap()

    const grid = page.getByRole('grid')
    await grid.locator('button').first().tap()
    await expect(grid.locator('button[aria-current="true"]')).toHaveCount(1)

    const viewport = page.viewportSize()
    if (!viewport) throw new Error('no viewport')
    await page.setViewportSize({
      width: viewport.height,
      height: viewport.width,
    })
    await page.waitForTimeout(600)

    const second = grid.locator('button').nth(5)
    await second.tap()
    await expect(second).toHaveAttribute('aria-current', 'true')
  })
})
