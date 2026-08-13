import { expect, expectClean, test } from '../fixtures'

test.describe('meridian', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop flow')

  test('one survey answer transmits and announces', async ({
    page,
    health,
  }) => {
    await page.goto('/meridian')
    await page.getByRole('button', { name: /Begin survey/ }).click()

    const choices = page.locator('aside[data-mode="choice"] button')
    const map = page.getByRole('application')
    await expect(choices.first().or(map).first()).toBeVisible({
      timeout: 15_000,
    })

    if (await map.isVisible().catch(() => false)) {
      await map.click()
      await page
        .getByRole('button', { name: /Place marker|Transmit/ })
        .first()
        .click()
    } else {
      await expect(choices.first()).toBeEnabled({ timeout: 15_000 })
      await choices.first().click()
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

  test('digit keys transmit a choice', async ({ page }) => {
    await page.goto('/meridian')
    await page.getByRole('button', { name: /Begin survey/ }).click()

    const console_ = page.locator('aside[data-mode="choice"]')
    await expect(console_).toBeVisible({ timeout: 15_000 })
    await expect(console_.locator('button').first()).toBeEnabled({
      timeout: 15_000,
    })
    await expect(console_.locator('button')).toHaveCount(4)

    await page.keyboard.press('2')
    await expect(console_.locator('button[data-state="correct"]')).toHaveCount(
      1,
      { timeout: 5_000 },
    )
  })
})

test.describe('meridian mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile flow')

  test('the choice keys tap and never open a keyboard', async ({ page }) => {
    await page.goto('/meridian')
    await page.getByRole('button', { name: /Begin survey/ }).click()

    const console_ = page.locator('aside[data-mode="choice"]')
    await expect(console_).toBeVisible({ timeout: 15_000 })
    const keys = console_.locator('button')
    await expect(keys.first()).toBeEnabled({ timeout: 15_000 })
    await expect(keys).toHaveCount(4)

    // no focusable text field exists, so the OS keyboard can never open
    await expect(page.locator('input, textarea')).toHaveCount(0)

    await keys.first().tap()
    await expect(console_.locator('button[data-state]').first()).toBeVisible({
      timeout: 5_000,
    })
  })
})
