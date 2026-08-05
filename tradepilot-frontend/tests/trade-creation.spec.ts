import { test, expect } from '@playwright/test';

test.describe('Trade Creation and Dashboard Update', () => {
  // Use a completely new unique email to avoid rate limiting
  const testEmail = `trade-final-${Date.now()}@example.com`;
  const testPassword = 'password123';
  const testName = 'Trade Final Test User';

  test('Complete flow: register, create trade, verify dashboard', async ({ page, request }) => {
    // Register new user
    await page.goto('/register');
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Get token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeDefined();

    // Create a trade via API
    const response = await request.post('http://localhost:4000/api/trades', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        pair: 'EURUSD',
        direction: 'BUY',
        entry: 1.0850,
        sl: 1.0800,
        tp: 1.0950,
        timeframe: 'H1',
      },
    });

    expect(response.ok()).toBeTruthy();
    const tradeData = await response.json();
    expect(tradeData.pair).toBe('EURUSD');

    // Reload the dashboard to get fresh data
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify updated metrics
    const totalTrades = page.locator('text=Total Trades').locator('..').locator('.text-2xl');
    await expect(totalTrades).toHaveText('1');
    
    const winRate = page.locator('text=Win Rate').locator('..').locator('.text-2xl');
    await expect(winRate).toHaveText('0%');
    
    const avgRR = page.locator('text=Avg RR').locator('..').locator('.text-2xl');
    const avgRRText = await avgRR.textContent();
    console.log('Avg RR value:', avgRRText);
    
    const bestPair = page.locator('text=Best Pair').locator('..').locator('.text-2xl');
    await expect(bestPair).toHaveText('EURUSD');
    
    const worstPair = page.locator('text=Worst Pair').locator('..').locator('.text-2xl');
    await expect(worstPair).toHaveText('EURUSD');
  });
});
