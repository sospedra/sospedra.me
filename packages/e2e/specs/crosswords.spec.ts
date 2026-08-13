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

  test('letter bank writes, steps clues, and never hides', async ({
    page,
    health,
  }) => {
    await page.goto('/crosswords')
    /* a human reaches Start after the first autosave has landed */
    await page.waitForFunction(() =>
      Object.keys(localStorage).some((key) => key.includes(':progress:')),
    )
    await page.locator('#crossword-start-key').tap()

    /* the bank rides game state: up right after Start, before any cell tap */
    const bankKeyA = page.getByRole('button', { name: 'A', exact: true })
    await expect(bankKeyA).toBeVisible()

    const grid = page.getByRole('grid')
    const first = grid.locator('button').first()
    await first.tap()
    await expect(page.locator('input[inputmode="none"]')).not.toBeFocused()

    await bankKeyA.tap()
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
    await expect(bankKeyA).toBeVisible()

    await page
      .getByRole('button', { name: 'Pause' })
      .filter({ visible: true })
      .first()
      .tap()
    await expect(bankKeyA).toBeVisible()
    await page
      .getByRole('button', { name: 'Resume' })
      .filter({ visible: true })
      .first()
      .tap()

    /* still writes after resume, into the entry the clue step selected */
    await bankKeyA.tap()
    await expect(
      grid.locator('button').filter({ hasText: 'A' }).nth(1),
    ).toBeVisible()

    expectClean(health)
  })
})
