import { expect, expectClean, test } from '../fixtures'

test.describe('w98', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop flow')

  test('windows, taskbar pairing, start menu, and winamp', async ({
    page,
    health,
  }) => {
    await page.goto('/w98')

    await page.getByRole('button', { name: 'Open Minesweeper' }).dblclick()
    const closeMines = page.getByRole('button', { name: 'Close Minesweeper' })
    await expect(closeMines).toBeVisible()
    const task = page.getByRole('button', { name: 'Minesweeper', exact: true })
    await expect(task).toBeVisible()

    await closeMines.click()
    await expect(closeMines).toHaveCount(0)
    await expect(task).toHaveCount(0)

    await page.getByRole('button', { name: 'Start', exact: true }).click()
    await expect(page.getByLabel('Close start menu')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Open Winamp' }).dblclick()
    await expect(
      page.getByRole('button', { name: 'Close player' }),
    ).toBeVisible()
    await expect(
      page.getByRole('list', { name: 'Audio tracklist' }),
    ).toBeVisible()

    expectClean(health)
  })
})
