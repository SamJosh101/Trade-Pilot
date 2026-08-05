import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Auth Error Handling', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'password123';
  const shortPassword = 'short';
  const wrongPassword = 'wrongpassword';

  test('Setup: Register test user', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    // Wait for navigation to dashboard on success
    await page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {
      // If already registered, that's fine - we'll just stay on register page
    });
  });

  test('1. Register with short password - client-side validation', async ({ page }) => {
    await page.goto('/register');
    
    // Fill form with short password
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', shortPassword);
    
    // Track network requests to ensure none are made
    const requestPromise = page.waitForRequest('**/api/auth/register', { timeout: 2000 }).catch(() => null);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait a bit to see if request fires
    const request = await requestPromise;
    
    // Verify no network request was made
    expect(request).toBeNull();
    
    // Verify inline error appears
    const errorElement = page.locator('p.text-red-700');
    await expect(errorElement).toBeVisible();
    const errorText = await errorElement.textContent();
    expect(errorText).toContain('Password must be at least 8 characters');
  });

  test('2. Register with already registered email', async ({ page }) => {
    await page.goto('/register');
    
    // Fill form with already registered email and valid password
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error response
    await page.waitForLoadState('networkidle');
    
    // Verify inline error appears with backend message
    const errorElement = page.locator('p.text-red-700');
    await expect(errorElement).toBeVisible();
    const errorText = await errorElement.textContent();
    expect(errorText).toContain('Email already registered');
  });

  test('3. Login with correct email but wrong password', async ({ page }) => {
    await page.goto('/login');
    
    // Fill form with registered email but wrong password
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', wrongPassword);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error response
    await page.waitForLoadState('networkidle');
    
    // Verify inline error appears
    const errorElement = page.locator('p.text-red-700');
    await expect(errorElement).toBeVisible();
    const errorText = await errorElement.textContent();
    expect(errorText).toContain('Invalid email or password');
  });

  test('4. Login with unregistered email', async ({ page }) => {
    await page.goto('/login');
    
    // Fill form with unregistered email
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', testPassword);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error response
    await page.waitForLoadState('networkidle');
    
    // Verify inline error appears with same message as #3
    const errorElement = page.locator('p.text-red-700');
    await expect(errorElement).toBeVisible();
    const errorText = await errorElement.textContent();
    expect(errorText).toContain('Invalid email or password');
  });
});
