#!/usr/bin/env node
/**
 * Comprehensive Test Loop Script - Task 11
 * Runs Playwright tests repeatedly until 100% pass rate is achieved
 * Headless-only enforcement with comprehensive failure analysis
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestLooper {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 10;
    this.delayBetweenAttempts = options.delay || 5000; // 5 seconds
    this.configFile = options.config || 'playwright-headless.config.js';
    this.testPattern = options.testPattern || '';
    this.verbose = options.verbose || false;
    
    this.attempt = 0;
    this.results = [];
    this.startTime = new Date();
    
    console.log('🔁 Test Loop Script - Headless-Only Mode');
    console.log(`   Max attempts: ${this.maxAttempts}`);
    console.log(`   Delay between attempts: ${this.delayBetweenAttempts}ms`);
    console.log(`   Config: ${this.configFile}`);
    console.log(`   Test pattern: ${this.testPattern || 'all tests'}`);
  }
  
  async run() {
    // Validate headless config exists
    if (!fs.existsSync(this.configFile)) {
      console.error(`❌ Configuration file not found: ${this.configFile}`);
      process.exit(1);
    }
    
    // Create loop results directory
    const loopResultsDir = 'test-results/loop-results';
    if (!fs.existsSync(loopResultsDir)) {
      fs.mkdirSync(loopResultsDir, { recursive: true });
    }
    
    console.log('🚀 Starting test loop execution...');
    console.log('🎯 Target: 100% pass rate');
    console.log('⚡ Mode: Headless-only (no GUI allowed)');
    console.log('');
    
    while (this.attempt < this.maxAttempts) {
      this.attempt++;
      console.log(`\n🔄 Attempt ${this.attempt}/${this.maxAttempts}`);
      console.log(`⏰ ${new Date().toLocaleTimeString()}`);
      
      const result = await this.runSingleTest();
      this.results.push(result);
      
      if (result.success) {
        console.log('🎉 SUCCESS! 100% pass rate achieved!');
        await this.generateSuccessReport();
        return this.exitSuccess();
      }
      
      console.log(`❌ Attempt ${this.attempt} failed: ${result.failureReason}`);
      console.log(`   Passed: ${result.passed}/${result.total} tests`);
      console.log(`   Pass rate: ${result.passRate.toFixed(1)}%`);
      
      if (this.attempt < this.maxAttempts) {
        console.log(`⏳ Waiting ${this.delayBetweenAttempts/1000}s before next attempt...`);
        await this.delay(this.delayBetweenAttempts);
      }
    }
    
    // All attempts exhausted
    console.log(`\n💥 LOOP FAILED: Maximum attempts (${this.maxAttempts}) reached`);
    await this.generateFailureReport();
    return this.exitFailure();
  }
  
  async runSingleTest() {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      // Build command arguments
      const args = [
        'test',
        '--config',
        this.configFile,
        '--reporter=json'
      ];
      
      if (this.testPattern) {
        args.push(this.testPattern);
      }
      
      // Ensure headless mode environment
      const env = {
        ...process.env,
        HEADED: 'false',
        PLAYWRIGHT_HEADED: 'false',
        FORCE_HEADLESS: 'true'
      };
      
      const testProcess = spawn('npx', ['playwright', ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env
      });
      
      let stdout = '';
      let stderr = '';
      
      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        if (this.verbose) {
          process.stdout.write(data);
        }
      });
      
      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        if (this.verbose) {
          process.stderr.write(data);
        }
      });
      
      testProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const result = this.parseTestResults(stdout, stderr, code, duration);
        
        // Save attempt results
        this.saveAttemptResults(result);
        
        resolve(result);
      });
      
      testProcess.on('error', (error) => {
        resolve({
          success: false,
          failureReason: `Process error: ${error.message}`,
          passed: 0,
          total: 0,
          passRate: 0,
          duration: Date.now() - startTime,
          error: error.message
        });
      });
    });
  }
  
  parseTestResults(stdout, stderr, exitCode, duration) {
    let passed = 0;
    let total = 0;
    let failureReason = 'Unknown failure';
    
    try {
      // Try to parse JSON output first
      const lines = stdout.split('\n');
      let jsonLine = null;
      
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.includes('"suites"')) {
          jsonLine = line.trim();
          break;
        }
      }
      
      if (jsonLine) {
        const results = JSON.parse(jsonLine);
        
        // Parse Playwright JSON results
        if (results.suites) {
          results.suites.forEach(suite => {
            this.countTests(suite, (testCase) => {
              total++;
              if (testCase.outcome === 'expected' || testCase.outcome === 'flaky') {
                passed++;
              }
            });
          });
        }
        
        if (results.stats) {
          total = results.stats.total || total;
          passed = (results.stats.expected || 0) + (results.stats.flaky || 0);
        }
      }
      
      // Fallback: parse from stderr/stdout patterns
      if (total === 0) {
        const passedMatch = stderr.match(/(\d+) passed/);
        const failedMatch = stderr.match(/(\d+) failed/);
        const skippedMatch = stderr.match(/(\d+) skipped/);
        
        passed = passedMatch ? parseInt(passedMatch[1]) : 0;
        const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
        const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
        
        total = passed + failed + skipped;
      }
      
    } catch (error) {
      failureReason = `Result parsing error: ${error.message}`;
    }
    
    // Determine failure reason
    if (exitCode !== 0) {
      if (stderr.includes('headed')) {
        failureReason = 'Headed mode attempted (blocked by headless enforcement)';
      } else if (stderr.includes('timeout')) {
        failureReason = 'Test timeout occurred';
      } else if (passed < total) {
        failureReason = `${total - passed} test(s) failed`;
      } else {
        failureReason = `Process exited with code ${exitCode}`;
      }
    }
    
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const success = total > 0 && passed === total && exitCode === 0;
    
    return {
      success,
      passed,
      total,
      passRate,
      failureReason,
      duration,
      exitCode,
      stdout: this.verbose ? stdout : stdout.substring(0, 1000),
      stderr: this.verbose ? stderr : stderr.substring(0, 1000)
    };
  }
  
  countTests(suite, callback) {
    if (suite.specs) {
      suite.specs.forEach(spec => {
        spec.tests.forEach(callback);
      });
    }
    
    if (suite.suites) {
      suite.suites.forEach(childSuite => {
        this.countTests(childSuite, callback);
      });
    }
  }
  
  saveAttemptResults(result) {
    const attemptFile = `test-results/loop-results/attempt-${this.attempt}.json`;
    const attemptData = {
      attempt: this.attempt,
      timestamp: new Date().toISOString(),
      ...result
    };
    
    fs.writeFileSync(attemptFile, JSON.stringify(attemptData, null, 2));
  }
  
  async generateSuccessReport() {
    const totalDuration = Date.now() - this.startTime.getTime();
    
    const report = {
      status: 'SUCCESS',
      target: '100% pass rate achieved',
      attempts: this.attempt,
      maxAttempts: this.maxAttempts,
      totalDuration: this.formatDuration(totalDuration),
      startTime: this.startTime.toISOString(),
      endTime: new Date().toISOString(),
      config: this.configFile,
      mode: 'headless-only',
      finalResult: this.results[this.results.length - 1],
      allAttempts: this.results
    };\n    
    fs.writeFileSync(\n      'test-results/loop-results/success-report.json',\n      JSON.stringify(report, null, 2)\n    );\n    \n    console.log('\\n📊 Success Report Generated:');\n    console.log(`   Total time: ${report.totalDuration}`);\n    console.log(`   Attempts needed: ${this.attempt}`);\n    console.log(`   Config used: ${this.configFile}`);\n  }\n  \n  async generateFailureReport() {\n    const totalDuration = Date.now() - this.startTime.getTime();\n    \n    const report = {\n      status: 'FAILURE',\n      reason: 'Maximum attempts exceeded without achieving 100% pass rate',\n      attempts: this.attempt,\n      maxAttempts: this.maxAttempts,\n      totalDuration: this.formatDuration(totalDuration),\n      startTime: this.startTime.toISOString(),\n      endTime: new Date().toISOString(),\n      config: this.configFile,\n      mode: 'headless-only',\n      bestResult: this.getBestResult(),\n      lastResult: this.results[this.results.length - 1],\n      allAttempts: this.results\n    };\n    \n    fs.writeFileSync(\n      'test-results/loop-results/failure-report.json',\n      JSON.stringify(report, null, 2)\n    );\n    \n    console.log('\\n📊 Failure Report Generated:');\n    console.log(`   Total time: ${report.totalDuration}`);\n    console.log(`   Max attempts reached: ${this.maxAttempts}`);\n    console.log(`   Best pass rate: ${report.bestResult.passRate.toFixed(1)}%`);\n  }\n  \n  getBestResult() {\n    return this.results.reduce((best, current) => {\n      return current.passRate > best.passRate ? current : best;\n    }, { passRate: 0 });\n  }\n  \n  formatDuration(ms) {\n    const seconds = Math.floor(ms / 1000);\n    const minutes = Math.floor(seconds / 60);\n    \n    if (minutes > 0) {\n      return `${minutes}m ${seconds % 60}s`;\n    }\n    return `${seconds}s`;\n  }\n  \n  delay(ms) {\n    return new Promise(resolve => setTimeout(resolve, ms));\n  }\n  \n  exitSuccess() {\n    console.log('\\n🎯 LOOP SUCCESS: 100% pass rate achieved!');\n    console.log('✅ All tests passing in headless mode');\n    process.exit(0);\n  }\n  \n  exitFailure() {\n    console.log('\\n💥 LOOP FAILURE: Could not achieve 100% pass rate');\n    console.log('❌ Check failure report for analysis');\n    process.exit(1);\n  }\n}\n\n// CLI interface\nif (require.main === module) {\n  const args = process.argv.slice(2);\n  const options = {};\n  \n  // Parse command line arguments\n  for (let i = 0; i < args.length; i++) {\n    switch (args[i]) {\n      case '--max-attempts':\n      case '-m':\n        options.maxAttempts = parseInt(args[++i]);\n        break;\n      case '--delay':\n      case '-d':\n        options.delay = parseInt(args[++i]) * 1000; // Convert to ms\n        break;\n      case '--config':\n      case '-c':\n        options.config = args[++i];\n        break;\n      case '--verbose':\n      case '-v':\n        options.verbose = true;\n        break;\n      case '--test':\n      case '-t':\n        options.testPattern = args[++i];\n        break;\n      case '--help':\n      case '-h':\n        console.log('Test Loop Script - Headless-Only Mode\\n');\n        console.log('Usage: node loop-until-pass.js [options]\\n');\n        console.log('Options:');\n        console.log('  -m, --max-attempts <n>  Maximum attempts (default: 10)');\n        console.log('  -d, --delay <seconds>   Delay between attempts (default: 5)');\n        console.log('  -c, --config <file>     Playwright config file');\n        console.log('  -t, --test <pattern>    Test file pattern');\n        console.log('  -v, --verbose           Verbose output');\n        console.log('  -h, --help              Show help\\n');\n        console.log('Example:');\n        console.log('  node loop-until-pass.js -m 5 -d 3 -v');\n        process.exit(0);\n    }\n  }\n  \n  const looper = new TestLooper(options);\n  looper.run().catch(error => {\n    console.error('❌ Loop script error:', error);\n    process.exit(1);\n  });\n}\n\nmodule.exports = TestLooper;