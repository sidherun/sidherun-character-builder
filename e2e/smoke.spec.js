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

test('a self-contained play link keeps backstory and session notes', async ({ page }) => {
  const backstory = 'Raised beside the 北風 café — Æsir kin, and the jarl’s oath.'
  const notes = [
    { title: 'Watch the 北 gate', body: 'Left open — riders at dusk.' },
    { title: 'Oath', body: 'Do not break bread with the jarl’s rivals.' },
  ]
  await createCharacter(page, 'Link Runner')

  await page.getByRole('button', { name: /Edit identity/ }).click()
  await page.getByLabel(/Backstory/).fill(backstory)
  await page.getByRole('button', { name: 'Done — back to character sheet' }).click()
  await expect(page.getByText(backstory)).toBeVisible()

  await page.getByRole('button', { name: 'Notes', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Session Notes' })
  await expect(dialog.getByText(backstory)).toBeVisible()
  for (const note of notes) {
    await dialog.getByRole('button', { name: '+ New Note' }).click()
    await dialog.getByLabel('Note title').fill(note.title)
    await dialog.getByLabel('Note body').fill(note.body)
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(dialog.getByText(note.body)).toBeVisible()
  }
  await dialog.getByRole('button', { name: 'Close session notes' }).click()

  await page.getByRole('button', { name: 'Back to roster' }).click()
  await expect(page.getByText('Link Runner')).toBeVisible()

  let playUrl = ''
  await page.route('https://tinyurl.com/**', async route => {
    playUrl = new URL(route.request().url()).searchParams.get('url') || ''
    await route.fulfill({ status: 500, body: 'shortener unavailable' })
  })
  await page.getByRole('button', { name: 'More options for Link Runner' }).click()
  await page.getByRole('menuitem', { name: 'Copy play link' }).click()
  await expect(page.getByRole('menuitem', { name: 'Copied (long)' })).toBeVisible()
  expect(playUrl).toContain('#play=')

  await page.goto(playUrl)
  await expect(page).toHaveTitle('Play Mode · Sidherun')
  await expect(page.getByRole('heading', { level: 1, name: 'Link Runner' })).toBeVisible()
  await page.getByRole('button', { name: 'Notes', exact: true }).click()
  const opened = page.getByRole('dialog', { name: 'Session Notes' })
  await expect(opened.getByText(backstory)).toBeVisible()
  await expect(opened.getByText('Backstory')).toBeVisible()
  for (const note of notes) {
    await expect(opened.getByRole('button', { name: `Edit note: ${note.title}` })).toBeVisible()
    await expect(opened.getByText(note.body)).toBeVisible()
  }
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
