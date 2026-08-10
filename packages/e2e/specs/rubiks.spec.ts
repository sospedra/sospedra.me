import { expect, expectClean, test } from '../fixtures'

const movesHud = (page: import('@playwright/test').Page) =>
  page.locator('span:has-text("moves") + span')

test.describe('rubiks desktop', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop-only flow')

  test('face keys turn layers from the keyboard', async ({ page, health }) => {
    await page.goto('/rubiks')

    const moves = movesHud(page)
    await expect(moves).toHaveText('0')

    await page.getByRole('application').focus()
    await page.keyboard.press('u')
    await expect(moves).toHaveText('1')
    await page.keyboard.press('f')
    await expect(moves).toHaveText('2')

    expectClean(health)
  })
})

test.describe('rubiks mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only flow')

  test('the tap pad turns layers', async ({ page, health }) => {
    await page.goto('/rubiks')

    const moves = movesHud(page)
    await expect(moves).toHaveText('0')

    const pad = page.getByRole('group', { name: 'Turn a layer' })
    await pad.getByRole('button', { name: 'U', exact: true }).tap()
    await expect(moves).toHaveText('1')

    expectClean(health)
  })
})
