import { test, expect } from '@playwright/test'

// Placeholder E2E test — expand once the app is running
test('home page loads', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await expect(page.getByRole('heading', { name: /habit tracker/i })).toBeVisible()
})
