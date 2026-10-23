import { test as base, expect } from '@playwright/test'

const test = base.extend({
  page: async ({ page }, run) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      localStorage.setItem('sidherun_dice_anim', 'off')
      localStorage.setItem('sidherun_dice_sound', 'off')
    })
    await run(page)
    expect(errors, 'uncaught page errors').toEqual([])
  },
})

async function createCharacter(page, name) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create New Character' }).click()
  const nameField = page.getByLabel('Character Name')
  await nameField.fill(name)
  await expect(nameField).toHaveValue(name)

  // Anchored: the done Welcome step is named "…completed…", and the banner
  // says "click Complete", so a substring match hits the wrong controls.
  const next = page.getByRole('button', { name: /^Next →/ })
  const complete = page.getByRole('button', { name: /^Complete/ })
  for (let step = 0; step < 8; step++) {
    if (await complete.isVisible()) break
    const label = await next.getAttribute('aria-label')
    await next.click()
    // Wait until this step is left behind, so a second click cannot land on it.
    await expect.poll(async () => (
      await complete.isVisible() ? 'done' : await next.getAttribute('aria-label')
    )).not.toBe(label)
  }
  await complete.click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

test('app loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Character Builder · Sidherun')
  await expect(page.getByRole('button', { name: 'Create New Character' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load from Roster' })).toBeVisible()
})

test('roster opens empty', async ({ page }) => {
  await page.goto('/#roster')
  await expect(page).toHaveTitle('Roster · Sidherun')
  await expect(page.getByRole('heading', { name: 'Sidherun' })).toBeVisible()
  await expect(page.getByText('Character Roster')).toBeVisible()
  await expect(page.getByText('No saved characters yet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create Your First Character' })).toBeVisible()
})

test('creation wizard saves a character onto the roster', async ({ page }) => {
  await createCharacter(page, 'Aria Fen')
  await page.getByRole('button', { name: 'Back to roster' }).click()
  await expect(page).toHaveTitle('Roster · Sidherun')
  await expect(page.getByText('Aria Fen')).toBeVisible()
  await expect(page.getByText('No saved characters yet.')).toHaveCount(0)
})

test('saves a session note that has a body and no title', async ({ page }) => {
  await createCharacter(page, 'Note Runner')
  await page.getByRole('button', { name: 'Notes', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Session Notes' })
  await dialog.getByRole('button', { name: '+ New Note' }).click()
  await dialog.getByLabel('Note body').fill('Gate left open\nWatch the south road')
  await expect(dialog.getByRole('button', { name: 'Save' })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog.getByRole('button', { name: 'Edit note: Gate left open' })).toBeVisible()
  await expect(dialog.getByText('Watch the south road')).toBeVisible()
})

test('play mode shows a d100 result', async ({ page }) => {
  await createCharacter(page, 'Roll Runner')
  await page.getByRole('button', { name: 'Enter Play Mode' }).click()
  // Play Mode from the sheet is in-page state. The hash stays on the builder,
  // so the document title does not change to "Play Mode".
  await expect(page.getByRole('heading', { level: 1, name: 'Roll Runner' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Roll Dice: plain d100, no modifier' })).toBeVisible()
  await page.getByRole('button', { name: 'Roll Dice: plain d100, no modifier' }).click()
  const banner = page.getByRole('status').filter({ hasText: 'Roll Dice' })
  await expect(banner).toBeVisible()
  await expect(banner).toContainText(/d100 \d+/)
})
