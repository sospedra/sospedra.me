import { expect, expectClean, skipGamesBoot, test } from '../fixtures'

const MINES_TILE = 'a[href="/w98?sw=mines"]'
const MERIDIAN_TILE = 'a[href="/meridian"]'

test.describe('games menu arming', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop flow')

  test('a click on the dark menu never launches a hidden tile', async ({
    page,
    health,
  }) => {
    await page.goto('/games')
    const tile = page.locator(MINES_TILE)
    const box = await tile.boundingBox()
    if (!box) throw new Error('mines tile has no bounding box')

    await skipGamesBoot(page)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

    // the tile finishes materializing long after an accidental
    // navigation would have completed
    await expect(tile.locator('span').first()).toHaveCSS('opacity', '1')
    await expect(page).toHaveURL(/\/games$/)

    await expect(tile).toHaveCSS('pointer-events', 'auto')
    await tile.click()
    await page.waitForURL('**/w98?sw=mines', { timeout: 30_000 })
    expectClean(health)
  })

  test('Enter right after the boot skip stays on the menu', async ({
    page,
    health,
  }) => {
    await page.goto('/games')
    await skipGamesBoot(page)
    await page.keyboard.press('Enter')

    const tile = page.locator(MERIDIAN_TILE)
    await expect(tile.locator('span').first()).toHaveCSS('opacity', '1')
    await expect(page).toHaveURL(/\/games$/)
    expectClean(health)
  })
})

test.describe('startup chime prefetch', () => {
  test('the games page preloads the chime in its head', async ({ page }) => {
    await page.goto('/games')
    await expect(
      page.locator('head link[rel="preload"][href="/sounds/startup.webm"]'),
    ).toHaveAttribute('as', 'audio')
  })

  test('hovering a games link warms the chime', async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), 'hover flow')
    await page.goto('/w98')
    const warmed = page.waitForRequest('**/sounds/startup.webm')
    await page.locator('a[href="/games"]').first().hover()
    await warmed
  })

  test('a blocked mount autoplay replays on the boot gesture', async ({
    page,
    isMobile,
  }) => {
    test.skip(Boolean(isMobile), 'desktop flow')
    // models the autoplay policy: play() rejects until a pointer gesture
    await page.addInitScript(() => {
      const gate = window as unknown as { __gestured?: boolean }
      const nativePlay = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function gatedPlay() {
        if (!gate.__gestured) {
          return Promise.reject(new DOMException('blocked', 'NotAllowedError'))
        }
        return nativePlay.call(this)
      }
      window.addEventListener(
        'pointerdown',
        () => {
          gate.__gestured = true
        },
        { capture: true },
      )
    })
    await page.goto('/games')

    // the boot timer flips the phase only after hydration, so the mount
    // autoplay has already run and sits rejected
    const chime = page.locator('audio[src="/sounds/startup.webm"]')
    await expect(page.locator('[data-phase]')).toHaveAttribute(
      'data-phase',
      'loading',
      { timeout: 15_000 },
    )
    expect(await chime.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true)

    await page.mouse.click(10, 10)
    await expect
      .poll(() => chime.evaluate((el: HTMLAudioElement) => el.currentTime))
      .toBeGreaterThan(0)
  })

  test('the first touch warms the chime', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch flow')
    await page.goto('/')
    // taps until hydration installs the once-listener, then one warms it
    await expect
      .poll(async () => {
        await page.touchscreen.tap(10, 10)
        return page.evaluate(() =>
          performance
            .getEntriesByType('resource')
            .some((entry) => entry.name.includes('/sounds/startup.webm')),
        )
      })
      .toBe(true)
  })
})

