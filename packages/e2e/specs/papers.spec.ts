import { expect, expectClean, test } from '../fixtures'

test.describe('papers', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop flow')

  test('reader scrolls the document and the carousel advances', async ({
    page,
    health,
  }) => {
    await page.goto('/papers')
    await page.locator('a[href="/papers/bazaar"]').first().click()
    await page.waitForURL('**/papers/bazaar')
    await expect(page.locator('article, main').first()).toBeVisible()

    for (let step = 0; step < 6; step += 1) {
      await page.mouse.wheel(0, 900)
      await page.waitForTimeout(150)
    }
    const scrolled = await page.evaluate(() => window.scrollY)
    expect(scrolled).toBeGreaterThan(1000)

    const undecoded = await page.locator('img').evaluateAll((images) =>
      images
        .filter((image) => {
          const rect = image.getBoundingClientRect()
          const inView = rect.bottom > 0 && rect.top < window.innerHeight
          return inView && image.complete && image.naturalWidth === 0
        })
        .map((image) => image.getAttribute('src')),
    )
    expect(undecoded).toEqual([])

    const carousel = page
      .locator('section[aria-roledescription="carousel"]')
      .first()
    await carousel.scrollIntoViewIfNeeded()
    const counter = carousel.locator('[aria-live="polite"]').first()
    const before = await counter.textContent()
    await carousel.getByRole('button', { name: 'Next shot' }).click()
    await expect(counter).not.toHaveText(before ?? '')

    expectClean(health)
  })
})
