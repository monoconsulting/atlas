const { chromium } = require('playwright');

async function setupSonarQube() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1500
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
        console.log('Navigating to SonarQube...');
        await page.goto('http://localhost:9010');
        await page.waitForTimeout(3000);
        
        // Take initial screenshot
        await page.screenshot({
            path: 'sonarqube-step1-initial.png',
            fullPage: true
        });
        
        console.log('Current URL:', page.url());
        console.log('Page title:', await page.title());
        
        // Try to login with default credentials
        console.log('Attempting login with admin/admin...');
        
        // Fill login form
        await page.fill('input[name="login"]', 'admin');
        await page.fill('input[name="password"]', 'admin');
        
        // Click login button
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        
        // Take screenshot after login attempt
        await page.screenshot({
            path: 'sonarqube-step2-after-login.png',
            fullPage: true
        });
        
        // Check if we need to change password
        const changePasswordText = await page.textContent('body');
        if (changePasswordText.includes('change') && changePasswordText.includes('password')) {
            console.log('Password change required...');
            
            // Try common password change scenarios
            const oldPasswordInput = page.locator('input[name="oldPassword"], input[name="previousPassword"]');
            const newPasswordInput = page.locator('input[name="password"], input[name="newPassword"]');
            const confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="passwordConfirmation"]');
            
            if (await oldPasswordInput.count() > 0) {
                await oldPasswordInput.fill('admin');
                await newPasswordInput.fill('admin123');
                await confirmPasswordInput.fill('admin123');
                
                await page.click('button[type="submit"], .btn-primary');
                await page.waitForTimeout(3000);
                
                await page.screenshot({
                    path: 'sonarqube-step3-password-changed.png',
                    fullPage: true
                });
            }
        }
        
        // Check if we're now on main dashboard
        const currentUrl = page.url();
        console.log('After login URL:', currentUrl);
        
        if (currentUrl.includes('/projects') || currentUrl.includes('/dashboard')) {
            console.log('Successfully logged in! Taking dashboard screenshot...');
            await page.screenshot({
                path: 'sonarqube-step4-dashboard.png',
                fullPage: true
            });
            
            // Look for projects or any scan results
            const projectCards = await page.locator('.project-card, .project-title, [data-test*="project"]').count();
            const metrics = await page.locator('.big-number, .metric-value').count();
            
            console.log(`Found ${projectCards} project cards and ${metrics} metrics`);
            
            if (projectCards > 0) {
                console.log('Found projects, clicking first one...');
                await page.click('.project-card:first-child, .project-title:first-child');
                await page.waitForTimeout(3000);
                
                await page.screenshot({
                    path: 'sonarqube-step5-project-details.png',
                    fullPage: true
                });
            } else {
                // Maybe we need to go to projects page
                const projectsLink = page.locator('text=Projects, [href*="projects"]');
                if (await projectsLink.count() > 0) {
                    console.log('Going to projects page...');
                    await projectsLink.click();
                    await page.waitForTimeout(3000);
                    
                    await page.screenshot({
                        path: 'sonarqube-step6-projects-page.png',
                        fullPage: true
                    });
                }
            }
        }
        
        // Get final page content for analysis
        const finalContent = await page.textContent('body');
        console.log('\\nFinal page content (first 500 chars):');
        console.log(finalContent.substring(0, 500));
        
    } catch (error) {
        console.error('Error during SonarQube setup:', error);
        await page.screenshot({
            path: 'sonarqube-error-final.png',
            fullPage: true
        });
    }
    
    await browser.close();
    console.log('\\nScreenshots saved! Check the following files:');
    console.log('- sonarqube-step1-initial.png');
    console.log('- sonarqube-step2-after-login.png');
    console.log('- sonarqube-step3-password-changed.png (if applicable)');
    console.log('- sonarqube-step4-dashboard.png (if logged in)');
    console.log('- sonarqube-step5-project-details.png (if projects found)');
}

setupSonarQube().catch(console.error);