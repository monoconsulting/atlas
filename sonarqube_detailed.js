const { chromium } = require('playwright');

async function captureSonarQubeDetailed() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 2000
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
        console.log('Navigating to SonarQube...');
        await page.goto('http://localhost:9010');
        await page.waitForTimeout(5000);
        
        // Take initial screenshot to see what we have
        await page.screenshot({
            path: 'sonarqube-initial.png',
            fullPage: true
        });
        
        // Check if we have a login page or dashboard
        const pageContent = await page.content();
        console.log('Page title:', await page.title());
        
        // Try different login approaches
        const loginInput = await page.locator('#login').count();
        const usernameInput = await page.locator('input[name="login"]').count();
        const emailInput = await page.locator('input[type="email"]').count();
        
        console.log(`Login inputs found: #login=${loginInput}, name=login=${usernameInput}, type=email=${emailInput}`);
        
        if (loginInput > 0) {
            console.log('Using #login field...');
            await page.fill('#login', 'admin');
            await page.fill('#password', 'admin');
        } else if (usernameInput > 0) {
            console.log('Using name=login field...');
            await page.fill('input[name="login"]', 'admin');
            await page.fill('input[name="password"]', 'admin');
        } else if (emailInput > 0) {
            console.log('Using email field...');
            await page.fill('input[type="email"]', 'admin');
            await page.fill('input[type="password"]', 'admin');
        }
        
        // Look for any submit button
        const submitButtons = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Log in")',
            'button:has-text("Sign in")',
            '.btn-primary'
        ];
        
        for (const selector of submitButtons) {
            if (await page.locator(selector).count() > 0) {
                console.log(`Clicking submit button: ${selector}`);
                await page.click(selector);
                break;
            }
        }
        
        await page.waitForTimeout(5000);
        
        // Take screenshot after login attempt
        await page.screenshot({
            path: 'sonarqube-after-login.png',
            fullPage: true
        });
        
        // Look for main dashboard elements
        const dashboardElements = await page.locator('.page-main').count();
        const projectElements = await page.locator('[data-test*="project"]').count();
        const metricsElements = await page.locator('.big-number').count();
        
        console.log(`Dashboard elements: ${dashboardElements}, Projects: ${projectElements}, Metrics: ${metricsElements}`);
        
        // If we're logged in, look for projects
        if (dashboardElements > 0 || projectElements > 0 || metricsElements > 0) {
            console.log('Appears to be logged in, looking for projects...');
            
            // Try to find projects navigation
            const projectsNav = [
                'text=Projects',
                '[href*="projects"]',
                '.navbar-nav a:has-text("Projects")'
            ];
            
            for (const selector of projectsNav) {
                if (await page.locator(selector).count() > 0) {
                    console.log(`Clicking projects navigation: ${selector}`);
                    await page.click(selector);
                    await page.waitForTimeout(3000);
                    break;
                }
            }
            
            await page.screenshot({
                path: 'sonarqube-projects-page.png',
                fullPage: true
            });
        }
        
        // Get all text content to analyze what's available
        const allText = await page.textContent('body');
        console.log('Available text content preview:');
        console.log(allText.substring(0, 500));
        
    } catch (error) {
        console.error('Error:', error);
    }
    
    await browser.close();
}

captureSonarQubeDetailed().catch(console.error);