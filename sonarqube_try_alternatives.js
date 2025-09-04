const { chromium } = require('playwright');

async function tryAlternativeCredentials() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 2000
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Common SonarQube credential combinations to try
    const credentialSets = [
        ['admin', 'admin'],
        ['admin', 'password'],
        ['admin', ''],
        ['sonar', 'sonar'],
        ['admin', 'sonar'],
        ['admin', 'admin123'],
        ['admin', '123456']
    ];
    
    try {
        await page.goto('http://localhost:9010');
        await page.waitForTimeout(3000);
        
        for (let i = 0; i < credentialSets.length; i++) {
            const [username, password] = credentialSets[i];
            console.log(`Trying credentials ${i + 1}/${credentialSets.length}: ${username}/${password || '(empty)'}`);
            
            // Clear and fill login form
            await page.fill('input[name="login"]', '');
            await page.fill('input[name="password"]', '');
            await page.fill('input[name="login"]', username);
            await page.fill('input[name="password"]', password);
            
            // Click login
            await page.click('button[type="submit"]');
            await page.waitForTimeout(3000);
            
            // Check if we're redirected (successful login)
            const currentUrl = page.url();
            console.log(`After login attempt: ${currentUrl}`);
            
            if (!currentUrl.includes('/sessions/new')) {
                console.log('SUCCESS! Login successful with:', username, '/', password || '(empty)');
                
                await page.screenshot({
                    path: `sonarqube-successful-login-${username}.png`,
                    fullPage: true
                });
                
                // Now let's explore the dashboard
                await page.waitForTimeout(2000);
                
                // Look for projects
                const projectsText = await page.textContent('body');
                if (projectsText.includes('project') || projectsText.includes('Project')) {
                    console.log('Found project-related content');
                    
                    // Try to find project links
                    const projectLinks = await page.locator('a[href*="dashboard"], a[href*="project"]').count();
                    console.log(`Found ${projectLinks} potential project links`);
                    
                    if (projectLinks > 0) {
                        await page.click('a[href*="dashboard"], a[href*="project"]');
                        await page.waitForTimeout(3000);
                        
                        await page.screenshot({
                            path: `sonarqube-project-view-${username}.png`,
                            fullPage: true
                        });
                    }
                }
                
                // Try to navigate to any available projects or analyses
                const navigationItems = [
                    'text=Projects',
                    'text=Issues', 
                    'text=Rules',
                    'text=Quality Profiles',
                    'text=Administration'
                ];
                
                for (const navItem of navigationItems) {
                    const element = page.locator(navItem);
                    if (await element.count() > 0) {
                        console.log(`Clicking navigation: ${navItem}`);
                        await element.click();
                        await page.waitForTimeout(2000);
                        
                        await page.screenshot({
                            path: `sonarqube-nav-${navItem.replace('text=', '').toLowerCase()}-${username}.png`,
                            fullPage: true
                        });
                        break; // Just try the first available navigation
                    }
                }
                
                return true; // Success
            } else {
                // Login failed, check for error message
                const errorText = await page.textContent('body');
                if (errorText.includes('Authentication failed')) {
                    console.log('Authentication failed for', username, '/', password);
                } else if (errorText.includes('change')) {
                    console.log('Password change may be required');
                }
            }
        }
        
        console.log('All credential combinations failed. SonarQube may need reset or has custom credentials.');
        return false;
        
    } catch (error) {
        console.error('Error during credential testing:', error);
        await page.screenshot({
            path: 'sonarqube-credential-test-error.png',
            fullPage: true
        });
        return false;
    } finally {
        await browser.close();
    }
}

tryAlternativeCredentials().then(success => {
    if (success) {
        console.log('\n✅ Successfully accessed SonarQube! Check the screenshots for analysis results.');
    } else {
        console.log('\n❌ Could not access SonarQube with standard credentials.');
        console.log('Consider resetting SonarQube or checking custom credentials.');
    }
}).catch(console.error);