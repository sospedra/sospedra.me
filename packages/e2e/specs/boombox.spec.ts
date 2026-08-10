import { expect, expectClean, test } from '../fixtures'

test.describe('boombox', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop flow')
  test.use({
    allowedHosts: ['2nvntiogo7b5zhfu.public.blob.vercel-storage.com'],
  })

  test('autoplay gate, guess feedback, and countdown', async ({
    page,
    health,
  }) => {
    await page.goto('/boombox')

    const play = page
      .getByRole('button', { name: 'Play', exact: true })
      .filter({ visible: true })
      .first()
    await play.click()
    await expect(play).toHaveAttribute('aria-pressed', 'true')

    const input = page
      .getByRole('combobox', { name: 'Guess the song' })
      .filter({ visible: true })
      .first()
    await input.fill('call me')
    const option = page.getByRole('option').filter({ visible: true }).first()
    const picked = (await option.textContent()) ?? ''
    await option.click()

    const guessedTitle = picked.split('·')[0]?.trim() ?? ''
    expect(guessedTitle).not.toBe('')
    const attempts = page
      .locator('aside[aria-label="Attempts"]')
      .filter({ visible: true })
      .first()
    await expect(attempts).toContainText(guessedTitle)

    await expect(
      page.getByText(/next tape \d{2}:\d{2}:\d{2}/i).first(),
    ).toBeVisible()
    expectClean(health)
  })
})
