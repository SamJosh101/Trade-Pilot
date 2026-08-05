import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

test.describe.configure({ mode: 'serial' });

test.describe('Trade CRUD Verification', () => {
  // Read token from file to avoid rate limiting
  const testToken = readFileSync('./tests/.auth-token', 'utf-8').trim();

  test.beforeEach(async ({ context }) => {
    // Set token at context level so it persists across navigations
    await context.addInitScript((token) => {
      localStorage.setItem('token', token);
    }, testToken);
  });

  test.beforeAll(async ({ request }) => {
    // Cleanup: delete all existing trades for the test user before starting
    try {
      const response = await request.get('http://localhost:4000/api/trades', {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      
      if (response.ok()) {
        const trades = await response.json();
        if (Array.isArray(trades) && trades.length > 0) {
          for (const trade of trades) {
            await request.delete(`http://localhost:4000/api/trades/${trade.id}`, {
              headers: {
                Authorization: `Bearer ${testToken}`,
              },
            });
          }
          console.log(`Cleaned up ${trades.length} existing trades before test suite`);
        }
      }
    } catch (error) {
      console.log('Cleanup failed (backend may not be running yet):', error);
    }
  });

  // Helper for numeric comparison (handles trailing zero differences)
  async function expectNumericValue(locator, expected: number) {
    const actual = await locator.inputValue();
    expect(Number(actual)).toBeCloseTo(expected, 5);
  }

  test('Setup: Verify auth works', async ({ page }) => {
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Debug: check current URL and token
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log('Token in localStorage:', token ? 'exists' : 'missing');
    
    expect(currentUrl).toContain('/dashboard');
  });

  test('a. Empty state on /trades', async ({ page }) => {
    await page.goto('http://localhost:5173/trades');
    await page.waitForLoadState('networkidle');
    
    // Debug: check page content and URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    const pageContent = await page.content();
    console.log('Page contains "No trades yet":', pageContent.includes('No trades yet'));
    console.log('Page contains "Trade History":', pageContent.includes('Trade History'));
    console.log('Page contains "Dashboard":', pageContent.includes('Dashboard'));
    
    // Check if we were redirected (auth issue)
    if (currentUrl.includes('/login')) {
      console.log('Redirected to login - auth failed with injected token');
      throw new Error('Auth failed - injected token not working');
    }
    
    // Check if there's an error or if there are existing trades
    const hasError = await page.locator('text=Failed to load trades').isVisible().catch(() => false);
    const hasTrades = await page.locator('tbody tr').isVisible().catch(() => false);
    const hasLoading = await page.locator('text=Loading trades...').isVisible().catch(() => false);
    
    console.log('hasError:', hasError, 'hasTrades:', hasTrades, 'hasLoading:', hasLoading);
    
    if (hasLoading) {
      await page.waitForTimeout(2000);
    }
    
    if (hasError) {
      await page.click('button:has-text("Retry")');
      await page.waitForLoadState('networkidle');
    }
    
    if (hasTrades) {
      const deleteButtons = page.locator('button:has-text("Delete")');
      const count = await deleteButtons.count();
      console.log('Deleting', count, 'existing trades');
      for (let i = 0; i < count; i++) {
        page.on('dialog', dialog => dialog.accept());
        await deleteButtons.first().click();
        await page.waitForTimeout(500);
      }
    }
    
    await expect(page.locator('text=No trades yet')).toBeVisible();
    await expect(page.locator('a[href="/trades/new"]').first()).toBeVisible();
    await expect(page.locator('text=Add Trade')).toBeVisible();
  });

  test('b. Client-side validation on AddTrade', async ({ page }) => {
    await page.goto('http://localhost:5173/trades/new');
    
    // Track network requests
    const requestPromise = page.waitForRequest('**/api/trades', { timeout: 2000 }).catch(() => null);
    
    // Try submitting with empty pair - HTML5 required attribute should block submit
    await page.fill('input[name="entry"]', '1.2650');
    await page.fill('input[name="sl"]', '1.2700');
    await page.fill('input[name="tp"]', '1.2550');
    await page.click('button[type="submit"]');
    
    // Verify no network request was made (blocked by HTML5 validation)
    const request = await requestPromise;
    expect(request).toBeNull();
    
    // Fill pair with valid value
    await page.fill('input[name="pair"]', 'GBPUSD');
    
    // Try negative entry - this should trigger our custom validation
    await page.fill('input[name="entry"]', '-1.2650');
    await page.click('button[type="submit"]');
    
    // Verify inline error for entry
    await expect(page.locator('text=Entry must be a positive number')).toBeVisible();
  });

  test('c. Create trade and check RR calculation', async ({ page }) => {
    await page.goto('http://localhost:5173/trades/new');
    
    // Fill valid trade data
    await page.fill('input[name="pair"]', 'GBPUSD');
    await page.selectOption('select[name="direction"]', 'SELL');
    await page.fill('input[name="entry"]', '1.2650');
    await page.fill('input[name="sl"]', '1.2700');
    await page.fill('input[name="tp"]', '1.2550');
    await page.fill('input[name="timeframe"]', 'H4');
    
    // Log the actual value being submitted
    console.log('SUBMITTING timeframe:', await page.locator('input[name="timeframe"]').inputValue());
    
    // Add response listener for POST call
    page.on('response', async (res) => {
      if (res.url().includes('/api/trades') && res.request().method() === 'POST') {
        console.log('CREATE POST BODY:', await res.text());
      }
    });
    
    await page.click('button[type="submit"]');
    
    // Wait for navigation to /trades
    await page.waitForURL('**/trades', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Debug: check what's on the page
    const currentUrl = page.url();
    console.log('Current URL after submit:', currentUrl);
    const hasTrades = await page.locator('tbody tr').isVisible().catch(() => false);
    console.log('Has trades in table:', hasTrades);
    
    if (!hasTrades) {
      const pageContent = await page.content();
      console.log('Page content snippet:', pageContent.substring(0, 500));
    }
    
    // Verify trade appears in table - use row-based selection
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.locator('td').nth(0)).toHaveText('GBPUSD');
    await expect(firstRow.locator('td').nth(1)).toHaveText('SELL');
    
    // Capture and log the trade ID from the edit link
    const editLink = firstRow.getByRole('link', { name: 'Edit' });
    const editHref = await editLink.getAttribute('href');
    const tradeId = editHref?.split('/')[2];
    console.log('TEST C - Created trade ID:', tradeId);
    
    // Check the actual values to see formatting
    const entryValue = await firstRow.locator('td').nth(2).textContent();
    const slValue = await firstRow.locator('td').nth(3).textContent();
    const tpValue = await firstRow.locator('td').nth(4).textContent();
    console.log('Entry:', entryValue, 'SL:', slValue, 'TP:', tpValue);
    
    // Calculate expected RR for SELL: risk = sl - entry = 1.2700 - 1.2650 = 0.0050
    // reward = entry - tp = 1.2650 - 1.2550 = 0.0100
    // RR = reward / risk = 0.0100 / 0.0050 = 2.0
    const rrCell = firstRow.locator('td').nth(6); // RR column (shifted after adding Timeframe)
    const rrValue = await rrCell.textContent();
    console.log('Expected RR: 2.0, Actual RR:', rrValue);
    expect(rrValue).toBe('2');
  });

  test('d. Edit trade functionality', async ({ page }) => {
    // Navigate to trades page to ensure we're on the right page
    await page.goto('http://localhost:5173/trades');
    await page.waitForLoadState('networkidle');
    
    // Log row count and edit link count
    console.log('Row count:', await page.locator('table tbody tr').count());
    console.log('Edit link count:', await page.getByRole('link', { name: 'Edit' }).count());
    
    // Click the Edit link specifically
    await page.getByRole('link', { name: 'Edit' }).first().click();
    
    // Assert we're on the edit page
    await expect(page).toHaveURL(/\/trades\/.+\/edit/);
    await page.waitForLoadState('networkidle');
    
    // Log what's actually in the form on load
    console.log('EDIT FORM timeframe on load:', await page.locator('input[name="timeframe"]').inputValue());
    console.log('Editing trade ID from URL:', page.url());
    
    // Verify form is pre-filled
    await expect(page.locator('input[name="pair"]')).toHaveValue('GBPUSD');
    await expect(page.locator('select[name="direction"]')).toHaveValue('SELL');
    await expectNumericValue(page.locator('input[name="entry"]'), 1.265);
    await expectNumericValue(page.locator('input[name="sl"]'), 1.27);
    await expectNumericValue(page.locator('input[name="tp"]'), 1.255);
    await expect(page.locator('input[name="timeframe"]')).toHaveValue('H4');
    
    // Change result to WIN and timeframe to H1
    await page.selectOption('select[name="result"]', 'WIN');
    await page.fill('input[name="timeframe"]', 'H1');
    
    // Add response listener for PUT call
    page.on('response', async (res) => {
      if (res.url().includes('/api/trades/') && res.request().method() === 'PUT') {
        console.log('PUT STATUS:', res.status());
        console.log('PUT BODY:', await res.text());
      }
    });
    
    await page.click('button[type="submit"]');
    
    // Wait for navigation back to /trades
    await page.waitForURL('**/trades');
    
    // Log table content before assertions
    console.log('TABLE CONTENT:', await page.locator('table').innerText());
    
    // Verify updated values in table
    await expect(page.locator('text=H1')).toBeVisible();
    await expect(page.locator('text=WIN')).toBeVisible();
  });

  test('e. Delete trade functionality', async ({ page }) => {
    // Navigate to trades page
    await page.goto('http://localhost:5173/trades');
    await page.waitForLoadState('networkidle');
    
    // Setup dialog handler before clicking delete
    page.on('dialog', dialog => dialog.accept());
    
    // Click delete on the first row
    await page.locator('tbody tr').first().getByText('Delete').click();
    
    // Wait for deletion to complete
    await page.waitForTimeout(1000);
    
    // Verify empty state returns
    await expect(page.locator('text=No trades yet')).toBeVisible();
  });

  test('f. Not found on fake trade ID', async ({ page }) => {
    await page.goto('http://localhost:5173/trades/00000000-0000-0000-0000-000000000000/edit');
    
    // Verify not found message
    await expect(page.locator('text=Trade not found')).toBeVisible();
  });

  test('g. Full page reload on /trades with trade present', async ({ page, request }) => {
    // Navigate to a page first to enable localStorage access
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    
    // First, create a trade via API
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeDefined();
    
    await request.post('http://localhost:4000/api/trades', {
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
    
    // Navigate to /trades
    await page.goto('http://localhost:5173/trades');
    await expect(page.locator('text=EURUSD')).toBeVisible();
    
    // Full page reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify table still loads correctly
    await expect(page.locator('text=EURUSD')).toBeVisible();
    await expect(page.locator('text=BUY')).toBeVisible();
  });
});
