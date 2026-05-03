import { test, expect } from '@playwright/test'

// Truncated Fischer–Spassky 1992 PGN — small, fully valid game prefix.
const PGN = `[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O *`

test('import PGN, navigate, copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')

  // Open Load dialog
  await page.getByRole('button', { name: 'Load…' }).click()
  const ta = page.getByRole('textbox')
  await ta.fill(PGN)
  await page.getByRole('button', { name: 'Load', exact: true }).click()

  // After loading, ply 0; first cell of move history should NOT be highlighted yet
  // and Next button should be enabled. Click Last to fast-forward.
  await page.getByLabel('Last move').click()

  // Move history should show 8 full moves (16 plies including the white-only last move 8). Spot-check.
  await expect(page.getByTestId('white-move-1')).toHaveText('e4')
  await expect(page.getByTestId('black-move-1')).toHaveText('e5')
  await expect(page.getByTestId('white-move-8')).toHaveText('c3')

  // Click move 4 (white) — should jump to ply 7 (after 4. Ba4)
  await page.getByTestId('white-move-4').click()

  // Press ArrowRight twice
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')

  // Press End to jump to last
  await page.keyboard.press('End')

  // Click Copy PGN
  await page.getByRole('button', { name: 'Copy PGN' }).click()

  // Read clipboard
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('1. e4')
  expect(clip).toContain('e5')
  expect(clip).toContain('Nf3')
  expect(clip).toContain('O-O')
})
