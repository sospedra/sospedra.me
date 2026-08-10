import type { Page } from '@playwright/test'
import { expect, expectClean, test, touchSwipe } from '../fixtures'

const activeDiscs = (page: Page) =>
  page
    .locator('button[data-state]')
    .evaluateAll((buttons) =>
      buttons
        .filter((button) => !button.closest('[inert]'))
        .map((button) => button.getAttribute('aria-label')),
    )

const waitForBrowse = async (page: Page) => {
  await expect
    .poll(async () => (await activeDiscs(page)).length, { timeout: 15_000 })
    .toBeGreaterThan(0)
}

test.describe('scavenger desktop', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop-only flow')

  test('spread flip, disc eject, and the zip close', async ({
    page,
    health,
  }) => {
    await page.goto('/scavenger')
    await waitForBrowse(page)

    const before = await activeDiscs(page)
    await page.getByRole('button', { name: 'next spread' }).click()
    await expect
      .poll(async () => JSON.stringify(await activeDiscs(page)))
      .not.toBe(JSON.stringify(before))

    const [current] = await activeDiscs(page)
    expect(current).toBeTruthy()
    const disc = page.getByRole('button', { name: current ?? '', exact: true })
    await disc.click()
    await expect(page.locator('#scavenger-liner h2')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('#scavenger-liner')).toHaveCount(0)
    await expect(page.locator('[data-out="true"]')).toHaveCount(0)

    expectClean(health)

    await page
      .getByRole('button', { name: 'zip the wallet shut and go back' })
      .click()
    await expect(page.locator('[data-closing="true"]')).toBeVisible()
  })
})

test.describe('scavenger mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only flow')

  test('portrait book hides arrows and flips by swipe', async ({
    page,
    health,
  }) => {
    await page.goto('/scavenger')
    await waitForBrowse(page)

    await expect(page.getByRole('button', { name: 'next spread' })).toBeHidden()

    const before = await activeDiscs(page)
    await touchSwipe(page, { x: 195, y: 480 }, { x: 195, y: 220 })
    await expect
      .poll(async () => JSON.stringify(await activeDiscs(page)))
      .not.toBe(JSON.stringify(before))

    const [current] = await activeDiscs(page)
    expect(current).toBeTruthy()
    const disc = page.getByRole('button', { name: current ?? '', exact: true })
    await disc.tap()
    await expect(page.locator('#scavenger-liner h2')).toBeVisible()

    expectClean(health)
  })
})
