import { expect, expectClean, test } from '../fixtures'

test.describe('meridian', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop flow')

  test('one survey answer transmits and announces', async ({
    page,
    health,
  }) => {
    await page.goto('/meridian')
    await page.getByRole('button', { name: /Begin survey/ }).click()

    const answer = page.getByPlaceholder(/Type a/i)
    const map = page.getByRole('application')
    await expect(answer.or(map).first()).toBeVisible({ timeout: 15_000 })

    if (await answer.isVisible()) {
      await answer.fill('Spain')
      await page.getByRole('button', { name: /Transmit/ }).click()
    } else {
      await map.click()
      await page
        .getByRole('button', { name: /Place marker|Transmit/ })
        .first()
        .click()
    }

    await expect
      .poll(async () =>
        (
          await page
            .locator(
              '[aria-live="polite"], [aria-live="assertive"], [role="status"]',
            )
            .allTextContents()
        )
          .join(' ')
          .trim(),
      )
      .not.toBe('')

    expectClean(health)
  })
})

const KEYBOARD_BAND = 365

test.describe('meridian mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile flow')

  test('the answer keys type, erase, and hide', async ({ page }) => {
    await page.goto('/meridian')
    await page.getByRole('button', { name: /Begin survey/ }).click()

    const answer = page.getByPlaceholder(/Type a/i)
    await expect(answer).toBeVisible({ timeout: 15_000 })
    // the countdown re-focuses the field, so wait the question out first
    await expect(answer).toBeEnabled({ timeout: 15_000 })
    // the OS keyboard must never open: the stage cannot survive the band
    await expect(answer).toHaveAttribute('inputmode', 'none')

    // WebKit never focuses a field that opens no keyboard, so suggestions
    // must follow the typed value
    await answer.evaluate((element) => element.blur())
    await expect(answer).not.toBeFocused()

    const console_ = page.locator('aside[data-mode="text"]')
    for (const letter of ['S', 'P', 'A']) {
      await console_.getByRole('button', { name: letter, exact: true }).tap()
    }
    await expect(answer).toHaveValue('SPA')
    await expect(page.getByRole('option', { name: /Spain/ })).toBeVisible()

    await console_.getByRole('button', { name: /Delete letter/ }).tap()
    await expect(answer).toHaveValue('SP')

    const keys = console_.locator('[class*="keyBank"]')
    await expect(keys).toBeVisible()
    await console_.getByRole('button', { name: /Hide the answer keys/ }).tap()
    await expect(keys).toBeHidden()
  })

  test('the stage stays playable under the soft keyboard', async ({ page }) => {
    await page.goto('/meridian')
    await page.getByRole('button', { name: /Begin survey/ }).click()

    const answer = page.getByPlaceholder(/Type a/i)
    await expect(answer).toBeVisible({ timeout: 15_000 })

    // fallback path, for touch screens wide enough to keep the OS keyboard:
    // no answer keys, the visible band shrinks, the layout viewport does not
    // (iOS), and the hook flags it
    await page
      .locator('aside[data-mode="text"]')
      .getByRole('button', { name: /Hide the answer keys/ })
      .tap()
    await page.evaluate((band) => {
      document.documentElement.style.setProperty(
        '--geo-viewport-height',
        `${band}px`,
      )
      document.querySelector('#vbody')?.setAttribute('data-keyboard', 'true')
    }, KEYBOARD_BAND)

    const box = async (selector: string) => {
      const rect = await page.locator(selector).first().boundingBox()
      if (!rect) throw new Error(`no box for ${selector}`)
      return rect
    }

    const frame = await box('[class*="artifactFrame"]')
    const art = await box(
      '[class*="promptOrbit"], [class*="flagAsset"], [class*="capitalArtifact"]',
    )
    const console_ = await box('aside[data-mode="text"]')

    expect(console_.y + console_.height).toBeLessThanOrEqual(KEYBOARD_BAND)
    expect(frame.height).toBeGreaterThan(90)
    expect(art.height).toBeLessThanOrEqual(frame.height)
    expect(art.y).toBeGreaterThanOrEqual(frame.y - 1)
  })
})
