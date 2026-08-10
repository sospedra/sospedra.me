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
            .locator('[aria-live="polite"], [aria-live="assertive"], [role="status"]')
            .allTextContents()
        ).join(' ').trim(),
      )
      .not.toBe('')

    expectClean(health)
  })
})
