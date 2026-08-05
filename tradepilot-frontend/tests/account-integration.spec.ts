import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

test.describe.configure({ mode: 'serial' });

test.describe('Account Integration Verification', () => {
  // Read token from file to avoid rate limiting
  const testToken = readFileSync('./tests/.auth-token', 'utf-8').trim();
  let mainAccountId: string;
  let secondAccountId: string;
  let tradeId: string;

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

    // Get or create initial accounts
    try {
      const accountsResponse = await request.get('http://localhost:4000/api/accounts', {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      
      if (accountsResponse.ok()) {
        const accounts = await accountsResponse.json();
        console.log('Initial accounts:', JSON.stringify(accounts, null, 2));
        
        if (Array.isArray(accounts) && accounts.length > 0) {
          mainAccountId = accounts[0].id;
          console.log('Main Account ID:', mainAccountId);
        } else {
          // User has no accounts (created before auto-creation), create one manually
          console.log('No accounts found, creating Main Account manually');
          const createResponse = await request.post('http://localhost:4000/api/accounts', {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            data: {
              name: 'Main Account',
              startingBalance: 0,
              currency: 'USD',
            },
          });
          
          if (createResponse.ok()) {
            const newAccount = await createResponse.json();
            mainAccountId = newAccount.id;
            console.log('Created Main Account ID:', mainAccountId);
          } else {
            throw new Error('Failed to create account');
          }
        }
      }
    } catch (error) {
      console.error('Failed to get/create initial accounts:', error);
      throw error;
    }
  });

  test.beforeEach(async ({ context }) => {
    // Set token at context level so it persists across navigations
    await context.addInitScript((token) => {
      localStorage.setItem('token', token);
    }, testToken);
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: delete test user's trades and accounts
    try {
      // Delete all trades
      const tradesResponse = await request.get('http://localhost:4000/api/trades', {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      
      if (tradesResponse.ok()) {
        const trades = await tradesResponse.json();
        if (Array.isArray(trades) && trades.length > 0) {
          for (const trade of trades) {
            await request.delete(`http://localhost:4000/api/trades/${trade.id}`, {
              headers: {
                Authorization: `Bearer ${testToken}`,
              },
            });
          }
          console.log('Cleaned up trades');
        }
      }
      
      // Delete accounts (should work after trades are deleted)
      const accountsResponse = await request.get('http://localhost:4000/api/accounts', {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });
      
      if (accountsResponse.ok()) {
        const accounts = await accountsResponse.json();
        if (Array.isArray(accounts) && accounts.length > 0) {
          for (const account of accounts) {
            try {
              await request.delete(`http://localhost:4000/api/accounts/${account.id}`, {
                headers: {
                  Authorization: `Bearer ${testToken}`,
                },
              });
            } catch (e) {
              console.log('Failed to delete account (may have trades):', account.id);
            }
          }
          console.log('Cleaned up accounts');
        }
      }
    } catch (error) {
      console.log('Cleanup failed:', error);
    }
  });

  test('a. Add Trade with auto-created account', async ({ page }) => {
    await page.goto('http://localhost:5173/trades/new');
    await page.waitForLoadState('networkidle');
    
    // Debug: check page content
    const pageContent = await page.content();
    console.log('Page contains "Account":', pageContent.includes('Account'));
    console.log('Page contains "No accounts available":', pageContent.includes('No accounts available'));
    console.log('Page contains "Loading accounts":', pageContent.includes('Loading accounts'));
    console.log('Current URL:', page.url());
    
    // Check for loading state
    const hasLoading = await page.locator('text=Loading accounts').isVisible().catch(() => false);
    console.log('Has loading message:', hasLoading);
    
    if (hasLoading) {
      await page.waitForTimeout(2000);
    }
    
    // Check for no accounts message
    const hasNoAccounts = await page.locator('text=No accounts available').isVisible().catch(() => false);
    console.log('Has "No accounts available" message:', hasNoAccounts);
    
    if (hasNoAccounts) {
      throw new Error('No accounts available - test user may not have auto-created account');
    }
    
    // Check account select is populated
    const accountSelect = page.locator('select[name="accountId"]');
    await expect(accountSelect).toBeVisible();
    
    // Get all options
    const options = await accountSelect.locator('option').allTextContents();
    console.log('Account select options:', options);
    
    // Verify "Main Account" is present
    expect(options).toContain('Main Account');
    
    // Verify default selection is Main Account
    const selectedValue = await accountSelect.inputValue();
    console.log('Selected account ID:', selectedValue);
    expect(selectedValue).toBe(mainAccountId);
    
    // Create a trade
    await page.fill('input[name="pair"]', 'EURUSD');
    await page.selectOption('select[name="direction"]', 'BUY');
    await page.fill('input[name="entry"]', '1.0850');
    await page.fill('input[name="sl"]', '1.0800');
    await page.fill('input[name="tp"]', '1.0950');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation to /trades
    await page.waitForURL('**/trades', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Verify trade was created
    await expect(page.locator('text=EURUSD')).toBeVisible();
    
    // Get trade ID from edit link
    const editLink = page.getByRole('link', { name: 'Edit' }).first();
    const editHref = await editLink.getAttribute('href');
    tradeId = editHref?.split('/')[2] || '';
    console.log('Created trade ID:', tradeId);
  });

  test('b. Accounts page and create second account', async ({ page, request }) => {
    await page.goto('http://localhost:5173/accounts');
    await page.waitForLoadState('networkidle');
    
    // Verify "Main Account" is listed
    await expect(page.locator('text=Main Account')).toBeVisible();
    
    // Click Add Account
    await page.click('button:has-text("Add Account")');
    await page.waitForLoadState('networkidle');
    
    // Fill account form
    await page.fill('input[name="name"]', 'FTMO Challenge');
    await page.fill('input[name="broker"]', 'FTMO');
    await page.fill('input[name="accountType"]', 'Challenge');
    await page.fill('input[name="startingBalance"]', '10000');
    await page.fill('input[name="currency"]', 'USD');
    
    // Submit
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // Verify back on accounts page
    await expect(page.locator('text=Accounts')).toBeVisible();
    
    // Verify "FTMO Challenge" appears
    await expect(page.locator('text=FTMO Challenge')).toBeVisible();
    
    // Get second account ID via API
    const accountsResponse = await request.get('http://localhost:4000/api/accounts', {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });
    const accounts = await accountsResponse.json();
    console.log('Accounts after creating second:', JSON.stringify(accounts, null, 2));
    
    if (Array.isArray(accounts) && accounts.length === 2) {
      secondAccountId = accounts.find((a: any) => a.name === 'FTMO Challenge').id;
      console.log('Second Account ID:', secondAccountId);
    }
  });

  test('c. Trade form shows both accounts', async ({ page }) => {
    await page.goto('http://localhost:5173/trades/new');
    await page.waitForLoadState('networkidle');
    
    // Check account select options
    const accountSelect = page.locator('select[name="accountId"]');
    const options = await accountSelect.locator('option').allTextContents();
    console.log('Account select options (both accounts):', options);
    
    // Verify both accounts are present
    expect(options).toContain('Main Account');
    expect(options).toContain('FTMO Challenge');
  });

  test('d. Edit trade preserves account', async ({ page }) => {
    // Navigate to edit page
    await page.goto(`http://localhost:5173/trades/${tradeId}/edit`);
    await page.waitForLoadState('networkidle');
    
    // Check account select value
    const accountSelect = page.locator('select[name="accountId"]');
    const selectedValue = await accountSelect.inputValue();
    console.log('Pre-filled account ID on edit:', selectedValue);
    
    // Verify it's the Main Account (the one we used to create the trade)
    expect(selectedValue).toBe(mainAccountId);
  });

  test('e. Delete account with trades returns 409', async ({ page }) => {
    // Try to delete Main Account (which has a trade)
    await page.goto('http://localhost:5173/accounts');
    await page.waitForLoadState('networkidle');
    
    // Find Main Account card and click delete
    const mainAccountCard = page.locator('text=Main Account').locator('..').locator('..');
    const deleteButton = mainAccountCard.locator('button:has-text("Delete")');
    
    page.on('dialog', dialog => dialog.accept());
    await deleteButton.click();
    await page.waitForTimeout(1000);
    
    // Check for 409 error message
    const errorMessage = page.locator('text=Cannot delete an account with trades');
    const isVisible = await errorMessage.isVisible().catch(() => false);
    console.log('409 error message visible:', isVisible);
    
    if (isVisible) {
      const errorText = await errorMessage.textContent();
      console.log('Actual 409 error text:', errorText);
    }
    
    expect(isVisible).toBe(true);
    
    // Verify account still exists
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Main Account')).toBeVisible();
  });

  test('f. Delete account without trades succeeds', async ({ page }) => {
    // First, delete the trade attached to FTMO Challenge
    // Actually, we need to create a trade on FTMO Challenge first
    await page.goto('http://localhost:5173/trades/new');
    await page.waitForLoadState('networkidle');
    
    // Select FTMO Challenge
    await page.selectOption('select[name="accountId"]', secondAccountId);
    
    // Create a trade
    await page.fill('input[name="pair"]', 'GBPUSD');
    await page.selectOption('select[name="direction"]', 'SELL');
    await page.fill('input[name="entry"]', '1.2650');
    await page.fill('input[name="sl"]', '1.2700');
    await page.fill('input[name="tp"]', '1.2550');
    
    await page.click('button[type="submit"]');
    await page.waitForURL('**/trades', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Now delete that trade
    page.on('dialog', dialog => dialog.accept());
    await page.locator('tbody tr').first().getByText('Delete').click();
    await page.waitForTimeout(1000);
    
    // Now try to delete FTMO Challenge account
    await page.goto('http://localhost:5173/accounts');
    await page.waitForLoadState('networkidle');
    
    const ftmoAccountCard = page.locator('text=FTMO Challenge').locator('..').locator('..');
    const deleteButton = ftmoAccountCard.locator('button:has-text("Delete")');
    
    page.on('dialog', dialog => dialog.accept());
    await deleteButton.click();
    await page.waitForTimeout(1000);
    
    // Verify no error message
    const errorMessage = page.locator('text=Cannot delete an account with trades');
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    console.log('Error message visible after deleting account without trades:', isErrorVisible);
    
    expect(isErrorVisible).toBe(false);
    
    // Verify FTMO Challenge is gone
    await page.reload();
    await page.waitForLoadState('networkidle');
    const ftmoVisible = await page.locator('text=FTMO Challenge').isVisible().catch(() => false);
    console.log('FTMO Challenge visible after deletion:', ftmoVisible);
    expect(ftmoVisible).toBe(false);
  });
});
