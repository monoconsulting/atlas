#!/usr/bin/env node
/**
 * Test Execution Wrapper Script - Task 11
 * Unified interface for headless-only Playwright testing with comprehensive artifact management
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestWrapper {
  constructor() {
    this.startTime = new Date();
    this.mode = 'single'; // single, loop, ci
    this.config = 'playwright-headless.config.js';
    this.verbose = false;
    this.cleanArtifacts = false;
    
    console.log('🎭 Playwright Test Wrapper - Headless-Only Mode');
    console.log('🔒 Headed mode blocked - CI/CD ready');
  }
  
  async execute(args) {
    this.parseArguments(args);
    
    // Pre-execution setup
    await this.setupExecution();
    
    // Execute based on mode
    let result;
    switch (this.mode) {
      case 'loop':
        result = await this.executeLoop();
        break;
      case 'ci':
        result = await this.executeCi();
        break;
      default:
        result = await this.executeSingle();
        break;
    }
    
    // Post-execution reporting
    await this.generateExecutionReport(result);
    
    return result;
  }
  
  parseArguments(args) {
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--mode':
        case '-m':
          this.mode = args[++i];
          break;
        case '--config':
        case '-c':
          this.config = args[++i];
          break;
        case '--verbose':
        case '-v':
          this.verbose = true;
          break;
        case '--clean':
          this.cleanArtifacts = true;
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
      }
    }
    
    console.log(`📋 Execution Mode: ${this.mode}`);
    console.log(`⚙️  Configuration: ${this.config}`);
    console.log(`🧹 Clean artifacts: ${this.cleanArtifacts}`);
  }
  
  showHelp() {
    console.log('Test Execution Wrapper - Headless-Only Mode\\n');
    console.log('Usage: node test-wrapper.js [options]\\n');
    console.log('Modes:');
    console.log('  single  Run tests once (default)');
    console.log('  loop    Run until 100% pass rate');
    console.log('  ci      CI/CD optimized execution\\n');
    console.log('Options:');
    console.log('  -m, --mode <mode>       Execution mode');
    console.log('  -c, --config <file>     Playwright config file');
    console.log('  -v, --verbose           Verbose output');
    console.log('  --clean                 Clean artifacts before execution');
    console.log('  -h, --help              Show help\\n');
    console.log('Examples:');
    console.log('  node test-wrapper.js --mode loop --verbose');
    console.log('  node test-wrapper.js --mode ci --clean');
  }
  
  async setupExecution() {
    console.log('🚀 Setting up test execution...');
    
    // Validate configuration exists
    if (!fs.existsSync(this.config)) {
      throw new Error(`Configuration file not found: ${this.config}`);
    }
    
    // Clean artifacts if requested
    if (this.cleanArtifacts) {
      console.log('🧹 Cleaning existing artifacts...');
      if (fs.existsSync('test-results')) {
        fs.rmSync('test-results', { recursive: true, force: true });
      }
    }
    
    // Ensure results directory exists
    const directories = [
      'test-results',
      'test-results/wrapper-reports',
      'test-results/execution-logs'
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Validate headless enforcement
    await this.validateHeadlessMode();
    
    console.log('✅ Setup complete');
  }
  
  async validateHeadlessMode() {
    console.log('🔍 Validating headless-only enforcement...');
    
    // Check for headed mode environment variables
    const headedVars = ['HEADED', 'PLAYWRIGHT_HEADED'];
    headedVars.forEach(varName => {
      if (process.env[varName] === 'true') {
        throw new Error(`❌ BLOCKED: ${varName}=true detected. Headed mode not allowed.`);
      }
    });
    
    // Check command line arguments
    if (process.argv.includes('--headed') || process.argv.includes('--ui')) {
      throw new Error('❌ BLOCKED: --headed or --ui arguments not allowed.');
    }
    
    console.log('✅ Headless-only mode validated');
  }
  
  async executeSingle() {
    console.log('🎯 Executing single test run...');
    
    return this.runPlaywright([
      'test',
      '--config',
      this.config,
      '--reporter=json,html'
    ]);
  }
  
  async executeLoop() {
    console.log('🔁 Executing loop until 100% pass rate...');
    
    const LoopScript = require('./loop-until-pass.js');
    const looper = new LoopScript({
      config: this.config,
      verbose: this.verbose,
      maxAttempts: 10
    });
    
    try {
      await looper.run();
      return { success: true, mode: 'loop' };
    } catch (error) {
      return { success: false, mode: 'loop', error: error.message };
    }
  }
  
  async executeCi() {
    console.log('🏗️ Executing CI/CD optimized test run...');
    
    // CI mode: strict, no retries, comprehensive artifacts
    return this.runPlaywright([
      'test',
      '--config',
      this.config,
      '--reporter=json,junit,html',
      '--max-failures=1'
    ]);
  }
  
  async runPlaywright(args) {
    return new Promise((resolve, reject) => {
      // Ensure headless environment
      const env = {
        ...process.env,
        HEADED: 'false',
        PLAYWRIGHT_HEADED: 'false',
        FORCE_HEADLESS: 'true'
      };
      
      const process_pw = spawn('npx', ['playwright', ...args], {
        stdio: this.verbose ? 'inherit' : 'pipe',
        env
      });
      
      let output = '';
      
      if (!this.verbose) {
        process_pw.stdout?.on('data', (data) => {
          output += data.toString();
        });
        
        process_pw.stderr?.on('data', (data) => {
          output += data.toString();
        });
      }
      
      process_pw.on('close', (code) => {
        const result = {
          success: code === 0,
          exitCode: code,
          output: output.substring(0, 2000), // Limit output size
          mode: this.mode
        };
        
        resolve(result);
      });
      
      process_pw.on('error', (error) => {
        reject(new Error(`Process error: ${error.message}`));
      });
    });
  }
  
  async generateExecutionReport(result) {
    console.log('📊 Generating execution report...');
    
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    const report = {
      wrapper: {
        version: '1.0.0',
        mode: this.mode,
        config: this.config,
        verbose: this.verbose,
        cleanArtifacts: this.cleanArtifacts
      },
      execution: {
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${(duration / 1000).toFixed(2)}s`,
        result: result
      },
      artifacts: {
        location: 'test-results/',
        reports: this.getArtifactSummary()
      },
      environment: {
        headlessEnforced: true,
        browser: 'chromium',
        node: process.version,
        platform: process.platform
      }
    };
    
    const reportFile = `test-results/wrapper-reports/execution-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📄 Report saved: ${reportFile}`);
    
    // Console summary
    console.log('\\n📈 Execution Summary:');
    console.log(`   Mode: ${this.mode}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Config: ${this.config}`);
    
    if (!result.success) {
      console.log('❌ Execution failed - check artifacts for details');
      process.exit(1);
    }
  }
  
  getArtifactSummary() {
    const artifacts = {};
    const artifactDirs = [
      'test-results/headless-reports',
      'test-results/headless-artifacts',
      'test-results/loop-results'
    ];
    
    artifactDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        artifacts[path.basename(dir)] = {
          count: files.length,
          files: files.slice(0, 5) // First 5 files
        };
      }
    });
    
    return artifacts;
  }
}

// CLI execution
if (require.main === module) {
  const wrapper = new TestWrapper();
  const args = process.argv.slice(2);
  
  wrapper.execute(args).catch(error => {
    console.error('❌ Wrapper execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = TestWrapper;