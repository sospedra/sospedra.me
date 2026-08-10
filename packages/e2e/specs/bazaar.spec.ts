import type { Page } from '@playwright/test'
import { expect, expectClean, test } from '../fixtures'

const enterMarket = async (page: Page) => {
  await page.goto('/bazaar')
  await page
    .locator('[data-label="door"]')
    .first()
    .waitFor({ state: 'attached' })
  await page.waitForTimeout(1500)
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-label="door"]')?.click()
  })
}

type TapPoint = { href: string; x: number; y: number }

/* the stall anchor is a zero-size box; its art overflows, so the tap
   point comes from the first painted descendant inside the viewport */
const visibleStall = (page: Page) =>
  page.evaluate<TapPoint | null>(() => {
    const anchors = [...document.querySelectorAll('[data-stall] a[href]')]
    for (const anchor of anchors) {
      const rect = [...anchor.querySelectorAll('*'), anchor]
        .map((el) => el.getBoundingClientRect())
        .find((r) => r.width > 20 && r.y > 40 && r.y + r.height < 780)
      const href = anchor.getAttribute('href')
      if (rect && href) {
        return { href, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
      }
    }
    return null
  })

test.describe('bazaar mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only flow')

  test('first tap opens the stall dialog, second tap navigates mid-typewriter', async ({
    page,
    health,
  }) => {
    await enterMarket(page)
    const stall = await expect
      .poll(() => visibleStall(page), { timeout: 15_000 })
      .not.toBeNull()
      .then(() => visibleStall(page))
    if (!stall) throw new Error('no stall in viewport')

    await page.touchscreen.tap(stall.x, stall.y)
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/bazaar')

    await page.touchscreen.tap(stall.x, stall.y)
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
      .toBe(stall.href)

    expectClean(health)
  })
})

test.describe('bazaar desktop', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop-only flow')

  test('hover opens the stall dialog and a single click navigates', async ({
    page,
    health,
  }) => {
    await enterMarket(page)
    const stall = await expect
      .poll(() => visibleStall(page), { timeout: 15_000 })
      .not.toBeNull()
      .then(() => visibleStall(page))
    if (!stall) throw new Error('no stall in viewport')

    await page.mouse.move(stall.x, stall.y)
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/bazaar')

    await page.mouse.click(stall.x, stall.y)
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
      .toBe(stall.href)

    expectClean(health)
  })
})
