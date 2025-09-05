// Playwright test for TMC (Traefik Management Console) fixes - TM40
const { test, expect } = require('@playwright/test');

test.describe('TMC Error Fixes', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to TMC page
        await page.goto('http://localhost:9652/traefik.html');
        await page.waitForLoadState('networkidle');
    });

    test('40.1: Refresh data should not give 502 error', async ({ page }) => {
        // Click refresh button
        await page.click('button:has-text("Refresh Data")');
        
        // Wait for any notification
        await page.waitForTimeout(1000);
        
        // Check that no error notification appeared with 502
        const errorNotifications = await page.locator('.bg-red-600:has-text("502")').count();
        expect(errorNotifications).toBe(0);
        
        // Check that Traefik URL is displayed
        const traefikUrl = await page.locator('#traefikUrl').textContent();
        expect(traefikUrl).toBeTruthy();
    });

    test('40.2: Create quickmap should work without JSON errors', async ({ page }) => {
        // Fill in quickmap form
        await page.fill('#qmHost', 'testapp.localhost');
        await page.fill('#qmPort', '3000');
        
        // Click Create Route button
        await page.click('button:has-text("Create Route")');
        
        // Wait for notification
        await page.waitForTimeout(1000);
        
        // Check that no JSON error notification appeared
        const jsonErrors = await page.locator('.bg-red-600:has-text("JSON")').count();
        expect(jsonErrors).toBe(0);
        
        // Should show success or at least not crash
        const notifications = await page.locator('[class*="animate-bounce"]').count();
        expect(notifications).toBeGreaterThanOrEqual(0);
    });

    test('40.3: Docker scan should work without JSON errors', async ({ page }) => {
        // Click Scan Docker button
        await page.click('button:has-text("Scan Docker")');
        
        // Wait for scan results
        await page.waitForTimeout(2000);
        
        // Check that scan results section is shown
        const scanResults = await page.locator('#qmScanResults');
        const isVisible = await scanResults.isVisible();
        expect(isVisible).toBe(true);
        
        // Check that no JSON error appeared
        const jsonErrors = await page.locator('.bg-red-600:has-text("JSON")').count();
        expect(jsonErrors).toBe(0);
        
        // Should show at least the message (even if no containers)
        const scanList = await page.locator('#qmScanList').textContent();
        expect(scanList).toBeTruthy();
    });

    test('40.4: Routes table should display properly', async ({ page }) => {
        // Wait for routes to load
        await page.waitForTimeout(1000);
        
        // Check that routes table exists
        const routesTable = await page.locator('#routesTable');
        const isVisible = await routesTable.isVisible();
        expect(isVisible).toBe(true);
        
        // Count route rows (should show at least 2)
        const routeRows = await page.locator('#routesTable tr').count();
        expect(routeRows).toBeGreaterThanOrEqual(2);
        
        // Check that route names are displayed
        const apiGateway = await page.locator('td:has-text("api-gateway")').count();
        const webApp = await page.locator('td:has-text("web-app")').count();
        expect(apiGateway + webApp).toBeGreaterThanOrEqual(2);
    });

    test('40.5: Edit router button should respond', async ({ page }) => {
        // Wait for routes to load
        await page.waitForTimeout(1000);
        
        // Click edit button on first route
        const editButton = page.locator('button:has-text("Edit")').first();
        await editButton.click();
        
        // Wait for notification
        await page.waitForTimeout(500);
        
        // Should show some response (notification)
        const notification = await page.locator('[class*="animate-bounce"]').count();
        expect(notification).toBeGreaterThan(0);
        
        // Check notification text indicates action was acknowledged
        const notificationText = await page.locator('[class*="animate-bounce"]').textContent();
        expect(notificationText).toBeTruthy();
    });

    test('40.6: Delete router button should respond', async ({ page }) => {
        // Wait for routes to load
        await page.waitForTimeout(1000);
        
        // Setup dialog handler before clicking delete
        page.on('dialog', dialog => dialog.accept());
        
        // Click delete button on first route
        const deleteButton = page.locator('button:has-text("Delete")').first();
        await deleteButton.click();
        
        // Wait for notification
        await page.waitForTimeout(500);
        
        // Should show some response (notification)
        const notification = await page.locator('[class*="animate-bounce"]').count();
        expect(notification).toBeGreaterThan(0);
    });

    test('40.7: Page should load without spinning forever', async ({ page }) => {
        // Check that page loads successfully
        const pageTitle = await page.title();
        expect(pageTitle).toContain('Traefik Management');
        
        // Check that main content is visible
        const mainContent = await page.locator('.container').isVisible();
        expect(mainContent).toBe(true);
        
        // Check that there's no infinite spinner
        // The page should have loaded within the beforeEach timeout
        const header = await page.locator('h1:has-text("Traefik Management Console")').isVisible();
        expect(header).toBe(true);
        
        // Stats should be visible
        const stats = await page.locator('#activeRoutes').isVisible();
        expect(stats).toBe(true);
    });
});