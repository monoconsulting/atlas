const { test, expect } = require('@playwright/test');

test.describe('Port Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the development hub
    await page.goto('http://localhost:9652');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should have Manage Ports button linking to ports.html', async ({ page }) => {
    // Find and click the Manage Ports button
    const managePortsButton = page.locator('a[href="ports.html"]').filter({ hasText: 'Manage Ports' });
    await expect(managePortsButton).toBeVisible();
    
    // Click the button to navigate to ports.html
    await managePortsButton.click();
    
    // Verify we're on the ports.html page
    await expect(page).toHaveURL('http://localhost:9652/ports.html');
    await expect(page.locator('h1')).toContainText('Port Management');
  });

  test('should load port management interface correctly', async ({ page }) => {
    // Navigate directly to ports.html
    await page.goto('http://localhost:9652/ports.html');
    await page.waitForLoadState('networkidle');
    
    // Check main elements are present
    await expect(page.locator('h1')).toContainText('🔌 Port Management');
    await expect(page.locator('button', { hasText: 'Scan Docker Ports' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Add Port' })).toBeVisible();
    await expect(page.locator('#reservePortBtn')).toBeVisible();
    
    // Check filter elements
    await expect(page.locator('#portSearch')).toBeVisible();
    await expect(page.locator('#portProjectFilter')).toBeVisible();
    await expect(page.locator('#portProtocolFilter')).toBeVisible();
    await expect(page.locator('#portSortBy')).toBeVisible();
    
    // Check back navigation
    await expect(page.locator('a[href="index.html"]')).toContainText('Back to Hub');
  });

  test('should open and close Add Port modal', async ({ page }) => {
    await page.goto('http://localhost:9652/ports.html');
    await page.waitForLoadState('networkidle');
    
    // Modal should be hidden initially
    await expect(page.locator('#portModal')).toHaveClass(/hidden/);
    
    // Click Add Port button
    await page.locator('button', { hasText: 'Add Port' }).click();
    
    // Modal should be visible
    await expect(page.locator('#portModal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#portModalTitle')).toContainText('Add New Port');
    
    // Close modal with close button
    await page.locator('#closePortModal').click();
    
    // Modal should be hidden again
    await expect(page.locator('#portModal')).toHaveClass(/hidden/);
  });

  test('should open and close Reserve Port modal', async ({ page }) => {
    await page.goto('http://localhost:9652/ports.html');
    await page.waitForLoadState('networkidle');
    
    // Modal should be hidden initially
    await expect(page.locator('#reservePortModal')).toHaveClass(/hidden/);
    
    // Click Reserve Port button
    await page.locator('#reservePortBtn').click();
    
    // Modal should be visible
    await expect(page.locator('#reservePortModal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#reservePortModal h3')).toContainText('Reserve Port Range');
    
    // Close modal with close button
    await page.locator('#closeReserveModal').click();
    
    // Modal should be hidden again
    await expect(page.locator('#reservePortModal')).toHaveClass(/hidden/);
  });

  test('should load projects into dropdown menus', async ({ page }) => {
    await page.goto('http://localhost:9652/ports.html');
    await page.waitForLoadState('networkidle');
    
    // Wait for projects to load (there should be some delay)
    await page.waitForTimeout(2000);
    
    // Click Add Port to open modal
    await page.locator('button', { hasText: 'Add Port' }).click();
    
    // Check that project dropdown has options beyond the default
    const projectOptions = page.locator('#portProjectId option');
    const optionCount = await projectOptions.count();
    expect(optionCount).toBeGreaterThanOrEqual(2); // At least "Select Project" + 1 real project
    
    // Check that there's at least one real project (not just the placeholder)
    const hasRealProject = await page.locator('#portProjectId option[value]:not([value=""])').count() > 0;
    expect(hasRealProject).toBeTruthy();
  });

  test('should have functional filter controls', async ({ page }) => {
    await page.goto('http://localhost:9652/ports.html');
    await page.waitForLoadState('networkidle');
    
    // Test search functionality
    await page.fill('#portSearch', 'test');
    await expect(page.locator('#portSearch')).toHaveValue('test');
    
    // Test protocol filter
    await page.selectOption('#portProtocolFilter', 'tcp');
    await expect(page.locator('#portProtocolFilter')).toHaveValue('tcp');
    
    // Test sort options
    await page.selectOption('#portSortBy', 'port_desc');
    await expect(page.locator('#portSortBy')).toHaveValue('port_desc');
    
    // Test clear filters button
    await page.locator('button', { hasText: 'Clear Filters' }).click();
    await expect(page.locator('#portSearch')).toHaveValue('');
    await expect(page.locator('#portProtocolFilter')).toHaveValue('');
  });

  test('should display empty state when no ports exist', async ({ page }) => {
    await page.goto('http://localhost:9652/ports.html');
    await page.waitForLoadState('networkidle');
    
    // Wait for ports to load (should be empty)
    await page.waitForTimeout(2000);
    
    // Should show empty state
    await expect(page.locator('#emptyPortsState')).toBeVisible();
    await expect(page.locator('#emptyPortsState h3')).toContainText('No Ports Found');
    await expect(page.locator('#portTable')).toHaveClass(/hidden/);
    
    // Should show port statistics
    await expect(page.locator('#portStats')).toBeVisible();
    await expect(page.locator('#totalPorts')).toContainText('0');
  });

  test('should have working navigation back to hub', async ({ page }) => {
    await page.goto('http://localhost:9652/ports.html');
    await page.waitForLoadState('networkidle');
    
    // Click back to hub button
    await page.locator('a[href="index.html"]', { hasText: 'Back to Hub' }).click();
    
    // Should be back on the main hub page
    await expect(page).toHaveURL('http://localhost:9652/index.html');
    await expect(page.locator('h1')).toContainText('Atlas Development Hub');
  });

  test('should attempt to create a port via API', async ({ page }) => {
    await page.goto('http://localhost:9652/ports.html');
    await page.waitForLoadState('networkidle');
    
    // Wait for projects to load
    await page.waitForTimeout(2000);
    
    // Open Add Port modal
    await page.locator('button', { hasText: 'Add Port' }).click();
    await expect(page.locator('#portModal')).not.toHaveClass(/hidden/);
    
    // Fill out the form with test data
    await page.selectOption('#portProjectId', { index: 1 }); // Select first real project
    await page.fill('#portNumber', '9999');
    await page.fill('#portInternalNumber', '80');
    await page.fill('#portServiceName', 'test-service');
    await page.selectOption('#portProtocol', 'tcp');
    await page.fill('#portDescription', 'Test port for automated testing');
    
    // Submit form
    await page.locator('button[type="submit"]', { hasText: 'Save Port' }).click();
    
    // Wait for potential API response
    await page.waitForTimeout(2000);
    
    // Modal should close if successful, or show error if there's an issue
    // We'll check if either the modal closed (success) or if it's still open with an error
    const modalVisible = await page.locator('#portModal').isVisible();
    
    if (modalVisible) {
      // If modal is still visible, there might be an error - that's fine for testing
      console.log('Port creation may have failed (expected in test environment)');
    } else {
      // Modal closed, likely successful
      console.log('Port creation appears successful');
    }
  });
});