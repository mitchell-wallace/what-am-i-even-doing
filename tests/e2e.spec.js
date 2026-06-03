import { test, expect } from '@playwright/test';

test.describe('PWA Viewport Thresholds & Aspect Ratio', () => {
  test('at narrow viewport (400px), container is borderless', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto('/');
    
    const container = page.locator('.app-container');
    await expect(container).toBeVisible();
    await expect(container).toHaveCSS('border-style', 'none');
    await expect(container).toHaveCSS('margin-top', '0px');
  });

  test('at intermediate viewport (500px), container is borderless after threshold relaxation', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 });
    await page.goto('/');
    
    const container = page.locator('.app-container');
    await expect(container).toBeVisible();
    
    // This is the key test for the threshold relaxation. 500px should be borderless.
    await expect(container).toHaveCSS('border-style', 'none');
    await expect(container).toHaveCSS('margin-top', '0px');
  });

  test('at wide viewport (700px), container has borders', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto('/');
    
    const container = page.locator('.app-container');
    await expect(container).toBeVisible();
    
    await expect(container).toHaveCSS('border-style', 'solid');
    await expect(container).not.toHaveCSS('margin-top', '0px');
  });
});
