import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

test.describe.configure({ mode: 'serial' });

test.describe('Analytics Verification', () => {
  const testToken = readFileSync('./tests/.auth-token', 'utf-8').trim();

  test.beforeEach(async ({ context }) => {
    await context.addInitScript((token) => {
      localStorage.setItem('token', token);
    }, testToken);
  });

  test('Empty state with zero trades', async ({ page }) => {
    await page.goto('http://localhost:5173/analytics');
    await page.waitForLoadState('networkidle');
    
    // Verify empty state renders
    await expect(page.locator('text=No trade data yet')).toBeVisible();
    await expect(page.locator('a[href="/trades/new"]')).toBeVisible();
    
    // Verify no chart elements are rendered
    await expect(page.locator('.recharts-wrapper')).not.toBeVisible();
  });

  test('Analytics with 3 test trades', async ({ page }) => {
    // Create 3 trades via API
    const token = testToken;
    
    // Trade 1: EURUSD, BUY, entry 1.1000, sl 1.0950, tp 1.1100, result WIN
    await page.request.post('http://localhost:4000/api/trades', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        pair: 'EURUSD',
        direction: 'BUY',
        entry: 1.1000,
        sl: 1.0950,
        tp: 1.1100,
        result: 'WIN',
      },
    });
    
    // Trade 2: EURUSD, BUY, entry 1.1000, sl 1.0950, tp 1.1050, result LOSS
    await page.request.post('http://localhost:4000/api/trades', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        pair: 'EURUSD',
        direction: 'BUY',
        entry: 1.1000,
        sl: 1.0950,
        tp: 1.1050,
        result: 'LOSS',
      },
    });
    
    // Trade 3: GBPUSD, SELL, entry 1.2700, sl 1.2750, tp 1.2600, result WIN
    await page.request.post('http://localhost:4000/api/trades', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        pair: 'GBPUSD',
        direction: 'SELL',
        entry: 1.2700,
        sl: 1.2750,
        tp: 1.2600,
        result: 'WIN',
      },
    });
    
    // Navigate to analytics
    await page.goto('http://localhost:5173/analytics');
    await page.waitForLoadState('networkidle');
    
    // Get analytics data directly from API for comparison
    const analytics = await page.request.get('http://localhost:4000/api/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const analyticsData = await analytics.json();
    
    console.log('ANALYTICS DATA:', JSON.stringify(analyticsData, null, 2));
    
    // Verify charts are rendered
    await expect(page.locator('text=Equity Curve')).toBeVisible();
    await expect(page.locator('text=Pair Breakdown')).toBeVisible();
    await expect(page.locator('text=Win/Loss Breakdown')).toBeVisible();
    await expect(page.locator('text=Direction Breakdown')).toBeVisible();
    
    // Log the visible metric card values
    const winsCard = page.locator('text=Wins').locator('..').locator('p').nth(1);
    const lossesCard = page.locator('text=Losses').locator('..').locator('p').nth(1);
    const buyCard = page.locator('text=Buy Trades').locator('..').locator('p').nth(1);
    const sellCard = page.locator('text=Sell Trades').locator('..').locator('p').nth(1);
    
    console.log('Wins value:', await winsCard.textContent());
    console.log('Losses value:', await lossesCard.textContent());
    console.log('Buy Trades value:', await buyCard.textContent());
    console.log('Sell Trades value:', await sellCard.textContent());
    
    // Hover over each bar in Pair Breakdown and read tooltip content
    const bars = page.locator('.recharts-bar-rectangle');
    const barCount = await bars.count();
    console.log('Bar count:', barCount);
    
    for (let i = 0; i < barCount; i++) {
      await bars.nth(i).hover();
      await page.waitForTimeout(1000); // Wait longer for tooltip to appear
      const tooltip = page.locator('.recharts-tooltip-wrapper').filter({ hasText: /GBPUSD|EURUSD/ }).first();
      const tooltipText = await tooltip.textContent();
      console.log(`Bar ${i} tooltip text:`, tooltipText);
    }
  });

  test('Full page reload with data present', async ({ page }) => {
    await page.goto('http://localhost:5173/analytics');
    await page.waitForLoadState('networkidle');
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify charts still render
    await expect(page.locator('text=Equity Curve')).toBeVisible();
    await expect(page.locator('text=Pair Breakdown')).toBeVisible();
    await expect(page.locator('text=Win/Loss Breakdown')).toBeVisible();
    await expect(page.locator('text=Direction Breakdown')).toBeVisible();
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: delete all trades
    const token = testToken;
    const response = await request.get('http://localhost:4000/api/trades', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.ok()) {
      const trades = await response.json();
      if (Array.isArray(trades) && trades.length > 0) {
        for (const trade of trades) {
          await request.delete(`http://localhost:4000/api/trades/${trade.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    }
  });
});
