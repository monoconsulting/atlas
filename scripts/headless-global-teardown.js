/**
 * Headless-Only Global Teardown Script
 * Task 11: Cleanup and artifact management after headless test execution
 */

const fs = require('fs');
const path = require('path');

async function globalTeardown(config) {
  console.log('🧹 Starting headless test execution cleanup...');
  
  // Read execution info
  const executionInfoPath = 'test-results/headless-reports/execution-info.json';
  let executionInfo = {};
  
  if (fs.existsSync(executionInfoPath)) {
    executionInfo = JSON.parse(fs.readFileSync(executionInfoPath, 'utf8'));
  }
  
  // Calculate execution duration
  const endTime = new Date().toISOString();
  const startTime = executionInfo.timestamp;
  const duration = startTime ? 
    ((new Date(endTime) - new Date(startTime)) / 1000).toFixed(2) + ' seconds' : 
    'unknown';
  
  console.log(`⏱️  Test execution completed in ${duration}`);
  
  // Analyze artifacts
  const artifactDirs = [
    'test-results/headless-artifacts/screenshots',
    'test-results/headless-artifacts/videos', 
    'test-results/headless-artifacts/traces'
  ];
  
  const artifactSummary = {};
  
  artifactDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const artifactType = path.basename(dir);
      artifactSummary[artifactType] = {
        count: files.length,
        files: files
      };
      console.log(`📸 ${artifactType}: ${files.length} files`);
    }
  });
  
  // Update execution info with completion data
  const finalExecutionInfo = {
    ...executionInfo,
    endTime,
    duration,
    artifacts: artifactSummary,
    status: 'completed'
  };
  
  try {
    fs.writeFileSync(
      executionInfoPath,
      JSON.stringify(finalExecutionInfo, null, 2)
    );
  } catch (error) {
    console.warn(`Warning: Could not write execution info: ${error.message}`);
  }
  
  // Generate summary report
  const summaryReport = {
    executionSummary: finalExecutionInfo,
    configUsed: 'playwright-headless.config.js',
    headlessEnforced: true,
    browserUsed: 'chromium',
    artifactLocations: {
      reports: 'test-results/headless-reports/',
      artifacts: 'test-results/headless-artifacts/',
      html: 'test-results/headless-reports/html/index.html',
      json: 'test-results/headless-reports/results.json'
    }
  };
  
  fs.writeFileSync(
    'test-results/headless-reports/summary.json',
    JSON.stringify(summaryReport, null, 2)
  );
  
  console.log('📋 Test summary generated');
  console.log('🏁 Headless test execution teardown complete');
  
  // Clean up old artifacts (keep last 5 runs)
  await cleanupOldArtifacts();
  
  return summaryReport;
}

async function cleanupOldArtifacts() {
  console.log('🗄️  Cleaning up old test artifacts...');
  
  const artifactDirs = [
    'test-results/headless-artifacts/screenshots',
    'test-results/headless-artifacts/videos',
    'test-results/headless-artifacts/traces'
  ];
  
  let totalCleaned = 0;
  
  artifactDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir)
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        time: fs.statSync(path.join(dir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time); // Newest first
    
    // Keep newest 20 files, remove older ones
    const filesToRemove = files.slice(20);
    
    filesToRemove.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        totalCleaned++;
      } catch (error) {
        console.warn(`Warning: Could not remove ${file.name}:`, error.message);
      }
    });
  });
  
  if (totalCleaned > 0) {
    console.log(`   Cleaned up ${totalCleaned} old artifact files`);
  } else {
    console.log('   No old artifacts to clean up');
  }
}

module.exports = globalTeardown;