import { expect, expectCanvasPainted, expectClean, test } from '../fixtures'

test.describe('travel', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop flow')

  test('dials, signalscope, radio, and power survive blocked streams', async ({
    page,
    health,
  }) => {
    await page.goto('/travel')

    const globe = page.locator('canvas').first()
    await expect(globe).toBeVisible()
    await page.waitForTimeout(2000)
    await expectCanvasPainted(globe)

    const heading = page.getByRole('slider', { name: 'Globe orbit heading' })
    await heading.focus()
    const before = await heading.getAttribute('aria-valuenow')
    await page.keyboard.press('ArrowRight')
    await expect(heading).not.toHaveAttribute('aria-valuenow', before ?? '')

    const contact = page
      .getByRole('button', { name: /^Tune the signalscope to/ })
      .first()
    await contact.click()
    await expect(contact).toHaveAttribute('aria-pressed', 'true')

    await page
      .getByRole('button', { name: /^Listen to/ })
      .first()
      .click()
    const preset = page.getByRole('button', { name: /^Tune to/ }).nth(1)
    await preset.click()
    await expect(preset).toHaveAttribute('aria-pressed', 'true')

    expectClean(health)

    await page
      .getByRole('link', { name: /Turn off the traveler/ })
      .click()
    await page.waitForURL('**/')
  })
})
