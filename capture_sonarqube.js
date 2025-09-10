const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureSonarQube() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
        console.log('Navigating to SonarQube...');
        await page.goto('http://localhost:9010', { waitUntil: 'networkidle' });
        
        // Wait for page to fully load
        await page.waitForTimeout(3000);
        
        // Check if login is required
        const loginForm = await page.locator('input[name="login"]').count();
        
        if (loginForm > 0) {
            console.log('Login required - attempting admin/admin...');
            await page.fill('input[name="login"]', 'admin');
            await page.fill('input[name="password"]', 'admin');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(3000);
        }
        
        // Take initial dashboard screenshot
        console.log('Taking dashboard screenshot...');
        await page.screenshot({
            path: 'sonarqube-dashboard.png',
            fullPage: true
        });
        
        // Look for projects
        const projectsLink = page.locator('text=Projects').first();
        if (await projectsLink.count() > 0) {
            console.log('Clicking Projects...');
            await projectsLink.click();
            await page.waitForTimeout(2000);
            
            await page.screenshot({
                path: 'sonarqube-projects.png',
                fullPage: true
            });
        }
        
        // Look for transkrtipt2 project specifically
        const transkrtiptProject = page.locator('text=transkrtipt2').first();
        if (await transkrtiptProject.count() > 0) {
            console.log('Found transkrtipt2 project - clicking...');
            await transkrtiptProject.click();
            await page.waitForTimeout(3000);
            
            await page.screenshot({
                path: 'sonarqube-transkrtipt2-overview.png',
                fullPage: true
            });
            
            // Navigate to Issues tab if available
            const issuesTab = page.locator('text=Issues').first();
            if (await issuesTab.count() > 0) {
                console.log('Viewing Issues...');
                await issuesTab.click();
                await page.waitForTimeout(2000);
                
                await page.screenshot({
                    path: 'sonarqube-transkrtipt2-issues.png',
                    fullPage: true
                });
            }
            
            // Navigate to Code tab if available
            const codeTab = page.locator('text=Code').first();
            if (await codeTab.count() > 0) {
                console.log('Viewing Code metrics...');
                await codeTab.click();
                await page.waitForTimeout(2000);
                
                await page.screenshot({
                    path: 'sonarqube-transkrtipt2-code.png',
                    fullPage: true
                });
            }
        } else {
            // Look for any project if transkrtipt2 not found
            console.log('transkrtipt2 not found, looking for any projects...');
            const anyProject = page.locator('a[href*="/dashboard"]').first();
            if (await anyProject.count() > 0) {
                console.log('Clicking first available project...');
                await anyProject.click();
                await page.waitForTimeout(3000);
                
                await page.screenshot({
                    path: 'sonarqube-project-overview.png',
                    fullPage: true
                });
            }
        }
        
        // Get current page title and URL for context
        const title = await page.title();
        const url = page.url();
        console.log(`Final page: ${title} - ${url}`);
        
    } catch (error) {
        console.error('Error capturing SonarQube:', error);
        await page.screenshot({
            path: 'sonarqube-error.png',
            fullPage: true
        });
    }
    
    await browser.close();
    console.log('Screenshots saved!');
}

captureSonarQube().catch(console.error);