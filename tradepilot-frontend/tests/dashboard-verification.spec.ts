import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Dashboard Verification', () => {
  const testEmail = `dashboard-test-${Date.now()}@example.com`;
  const testPassword = 'password123';
  const testName = 'Dashboard Test User';

  test('a. Register new user and verify dashboard shows zeros', async ({ page }) => {
    await page.goto('/register');
    
    // Register new user
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    
    // Verify dashboard metrics for new user
    await expect(page.locator('h1:has-text("Welcome, Dashboard Test User")')).toBeVisible();
    
    const totalTrades = page.locator('text=Total Trades').locator('..').locator('.text-2xl');
    await expect(totalTrades).toHaveText('0');
    
    const winRate = page.locator('text=Win Rate').locator('..').locator('.text-2xl');
    await expect(winRate).toHaveText('0%');
    
    const avgRR = page.locator('text=Avg RR').locator('..').locator('.text-2xl');
    await expect(avgRR).toHaveText('0');
    
    const bestPair = page.locator('text=Best Pair').locator('..').locator('.text-2xl');
    await expect(bestPair).toHaveText('—');
    
    const worstPair = page.locator('text=Worst Pair').locator('..').locator('.text-2xl');
    await expect(worstPair).toHaveText('—');
  });

  test('b. Test sidebar navigation', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Test Dashboard link is active
    const dashboardLink = page.locator('a[href="/dashboard"]');
    await expect(dashboardLink).toHaveClass(/bg-emerald-50/);
    
    // Navigate to Trades
    await page.click('a[href="/trades"]');
    await page.waitForURL('**/trades');
    await expect(page.locator('text=Trade History')).toBeVisible();
    await expect(page.locator('text=Coming soon')).toBeVisible();
    
    // Verify Trades link is now active
    const tradesLink = page.locator('a[href="/trades"]');
    await expect(tradesLink).toHaveClass(/bg-emerald-50/);
    
    // Navigate to Analytics
    await page.click('a[href="/analytics"]');
    await page.waitForURL('**/analytics');
    await expect(page.locator('text=Analytics')).toBeVisible();
    await expect(page.locator('text=Coming soon')).toBeVisible();
    
    // Verify Analytics link is now active
    const analyticsLink = page.locator('a[href="/analytics"]');
    await expect(analyticsLink).toHaveClass(/bg-emerald-50/);
    
    // Navigate back to Dashboard
    await page.click('a[href="/dashboard"]');
    await page.waitForURL('**/dashboard');
    await expect(dashboardLink).toHaveClass(/bg-emerald-50/);
  });

  test('e. Test logout functionality', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Verify sidebar and navbar are visible
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    
    // Click logout
    await page.click('button:has-text("Logout")');
    
    // Verify navigation to landing page (wait for landing page content)
    await expect(page.locator('text=TradePilot')).toBeVisible({ timeout: 5000 });
    
    // Verify sidebar and navbar are NOT visible
    await expect(page.locator('aside')).not.toBeVisible();
    await expect(page.locator('header')).not.toBeVisible();
  });
});
