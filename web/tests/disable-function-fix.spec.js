// tests/disable-function-fix.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Disable Function Fix', () => {

    test('should hide disabled projects from admin panel', async ({ page }) => {
        console.log('Testing disable function fix - checking if active=false projects are hidden');
        
        // Navigate to admin panel
        await page.goto('http://localhost:9652/admin.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000); // Wait for projects to load
        
        // Take screenshot
        await page.screenshot({ path: 'test-results/disable-fix-admin-panel.png', fullPage: true });
        
        // Get all visible project cards
        const projectCards = await page.locator('.bg-slate-900').count();
        console.log(`Found ${projectCards} visible project cards`);
        
        // Check that "Test Project" (which has active=false) is not visible
        const testProjectVisible = await page.getByText('Test Project').isVisible();
        expect(testProjectVisible).toBe(false);
        console.log('✅ Test Project (active=false) is correctly hidden');
        
        // Verify that active projects are still visible
        const atlasVisible = await page.getByText('Atlas').isVisible();
        expect(atlasVisible).toBe(true);
        console.log('✅ Atlas (active=true) is correctly shown');
        
        // Verify via API that disabled project still exists in database but is filtered
        const apiResponse = await page.request.get('http://localhost:8199/api/projects');
        expect(apiResponse.ok()).toBeTruthy();
        
        const projectsData = await apiResponse.json();
        const allProjects = projectsData.projects;
        const disabledProjects = allProjects.filter(p => p.active === false);
        
        console.log(`API returns ${allProjects.length} total projects`);
        console.log(`${disabledProjects.length} projects are disabled in database`);
        
        expect(disabledProjects.length).toBeGreaterThan(0);
        console.log('✅ Disabled projects exist in database but are filtered from UI');
        
        console.log('\\n=== DISABLE FUNCTION FIX VERIFIED ===');
        console.log('✅ Projects with active=false are hidden from admin interface');
        console.log('✅ Projects with active=true are still visible');
        console.log('✅ Disabled projects remain in database for re-activation');
    });
    
});