const { chromium } = require('playwright');

async function captureFreshSonarQube() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1500
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
        console.log('Accessing fresh SonarQube installation...');
        await page.goto('http://localhost:9010');
        await page.waitForTimeout(3000);
        
        // Take initial screenshot
        await page.screenshot({
            path: 'sonarqube-fresh-initial.png',
            fullPage: true
        });
        
        console.log('Page title:', await page.title());
        console.log('Current URL:', page.url());
        
        // Try default credentials for fresh installation
        console.log('Attempting login with admin/admin...');
        
        await page.fill('input[name="login"]', 'admin');
        await page.fill('input[name="password"]', 'admin');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
        
        // Take screenshot after login attempt
        await page.screenshot({
            path: 'sonarqube-fresh-after-login.png',
            fullPage: true
        });
        
        console.log('After login URL:', page.url());
        
        // Check if we're redirected or need password change
        const currentUrl = page.url();
        if (currentUrl.includes('/sessions/new')) {
            console.log('Login failed, still on login page');
            
            // Check if there's a specific error or setup required
            const bodyText = await page.textContent('body');
            console.log('Page contains setup or error info:');
            console.log(bodyText.substring(0, 200));
        } else {
            console.log('Login successful! Exploring dashboard...');
            
            // Take dashboard screenshot
            await page.screenshot({
                path: 'sonarqube-fresh-dashboard.png',
                fullPage: true
            });
            
            // Look for projects
            const projectsText = await page.textContent('body');
            if (projectsText.includes('Transkription') || projectsText.includes('transkript')) {
                console.log('Found Transkription project data!');
                
                // Try to find and click on the project
                const projectLink = page.locator('text=Transkription').first();
                if (await projectLink.count() > 0) {
                    console.log('Clicking Transkription project...');
                    await projectLink.click();
                    await page.waitForTimeout(3000);
                    
                    await page.screenshot({
                        path: 'sonarqube-transkription-project.png',
                        fullPage: true
                    });
                    
                    // Navigate to different tabs if available
                    const tabs = ['Issues', 'Code', 'Coverage', 'Duplications', 'Settings'];
                    for (const tab of tabs) {
                        const tabLink = page.locator(`text=${tab}`).first();
                        if (await tabLink.count() > 0) {
                            console.log(`Viewing ${tab} tab...`);
                            await tabLink.click();
                            await page.waitForTimeout(2000);
                            
                            await page.screenshot({
                                path: `sonarqube-transkription-${tab.toLowerCase()}.png`,
                                fullPage: true
                            });
                        }
                    }
                }
            }
            
            // Also try to find any other projects
            const projectNavigation = [
                'text=Projects',
                '[href*="projects"]',
                'text=All Projects'
            ];
            
            for (const nav of projectNavigation) {
                const navElement = page.locator(nav);
                if (await navElement.count() > 0) {
                    console.log(`Navigating to projects via: ${nav}`);
                    await navElement.click();
                    await page.waitForTimeout(3000);
                    
                    await page.screenshot({
                        path: 'sonarqube-projects-overview.png',
                        fullPage: true
                    });
                    break;
                }
            }
        }
        
    } catch (error) {
        console.error('Error capturing SonarQube:', error);
        await page.screenshot({
            path: 'sonarqube-capture-error.png',
            fullPage: true
        });
    }
    
    await browser.close();
    console.log('\\nScreenshots saved! Check for analysis results.');
}

captureFreshSonarQube().catch(console.error);