import { test, expect } from '@playwright/test'

const PINNED_KNIGHT_FEN = '4k3/8/8/4r3/8/4N3/8/4K3 w - - 0 1'
const HANGING_PAWN_FEN = '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1'

test.describe('Threat heatmap', () => {
  test('renders stripe indicators by default and toggles with H', async ({ page }) => {
    await page.goto('/')

    const initialStripes = await page.locator('[data-stripe]').count()
    expect(initialStripes).toBeGreaterThan(0)

    await page.keyboard.press('h')
    await expect(page.locator('[data-stripe]')).toHaveCount(0)

    await page.keyboard.press('h')
    const afterToggle = await page.locator('[data-stripe]').count()
    expect(afterToggle).toBeGreaterThan(0)
  })

  test('shows a lock badge on an absolutely-pinned piece', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Load…' }).click()
    await page.locator('textarea').fill(PINNED_KNIGHT_FEN)
    await page.getByRole('button', { name: 'Load', exact: true }).click()
    await expect(page.locator('[data-inert-lock="true"]')).toHaveCount(1)
  })

  test('shows a unilateral border on a hanging piece', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Load…' }).click()
    await page.locator('textarea').fill(HANGING_PAWN_FEN)
    await page.getByRole('button', { name: 'Load', exact: true }).click()
    await expect(page.locator('[data-unilateral="true"]').first()).toBeVisible()
  })
})
