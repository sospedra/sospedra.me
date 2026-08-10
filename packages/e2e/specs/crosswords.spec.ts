import type { Page } from '@playwright/test'
import { expect, expectClean, test } from '../fixtures'

const startPuzzle = async (page: Page) => {
  await page.goto('/crosswords')
  await page.locator('#crossword-start-key').click()
}

test.describe('crosswords desktop', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'desktop-only flow')

  test('typing, movement, clue rail, and check survive a reload', async ({
    page,
    health,
  }) => {
    await startPuzzle(page)
    const grid = page.getByRole('grid')
    const cells = grid.locator('button')
    const first = cells.first()

    await first.click()
    const selected = grid.locator('button[aria-current="true"]')
    await expect(selected).toHaveCount(1)
    const origin = await selected.getAttribute('aria-label')

    await page.keyboard.type('A')
    await expect(first).toContainText('A')
    await expect(selected).not.toHaveAttribute('aria-label', origin ?? '')

    await page
      .getByRole('button', { name: /^Check answers/ })
      .filter({ visible: true })
      .first()
      .click()
    await expect(
      grid
        .locator('button[data-checked="true"], button[data-incorrect="true"]')
        .first(),
    ).toBeVisible()

    await first.click()
    const reselected = await selected.getAttribute('aria-label')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(selected).not.toHaveAttribute('aria-label', reselected ?? '')

    const rail = page
      .locator('aside[aria-label="Clues"]')
      .filter({ visible: true })
    await expect(rail.locator('[aria-current="true"]').first()).toBeVisible()

    await page.reload()
    await expect(
      page.getByRole('grid').locator('button').first(),
    ).toContainText('A')
    expectClean(health)
  })
})

test.describe('crosswords mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only flow')

  test('letter bank writes, the clue bar steps, and the sheet opens', async ({
    page,
    health,
  }) => {
    await page.goto('/crosswords')
    await page.locator('#crossword-start-key').tap()

    const grid = page.getByRole('grid')
    const first = grid.locator('button').first()
    await first.tap()

    const proxy = page.locator('input[inputmode="none"]')
    await expect(proxy).toBeFocused()

    await page.getByRole('button', { name: 'A', exact: true }).tap()
    await expect(first).toContainText('A')

    const activeClue = page.locator('#crossword-active-clue-text')
    const before = await activeClue.textContent()
    await page.getByRole('button', { name: 'Next clue' }).tap()
    await expect(activeClue).not.toHaveText(before ?? '')

    await page
      .getByRole('button', { name: 'Clues' })
      .filter({ visible: true })
      .first()
      .tap()
    await expect(page.locator('#clue-sheet-title')).toBeVisible()
    await page
      .getByRole('button', { name: 'Close' })
      .filter({ visible: true })
      .first()
      .tap()
    await expect(page.locator('#clue-sheet-title')).toBeHidden()

    await page
      .getByRole('button', { name: 'Pause' })
      .filter({ visible: true })
      .first()
      .tap()
    await page
      .getByRole('button', { name: 'Resume' })
      .filter({ visible: true })
      .first()
      .tap()
    await expect(proxy).toBeFocused()

    expectClean(health)
  })
})
