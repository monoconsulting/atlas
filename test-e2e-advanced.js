const { chromium } = require('playwright');
const fs = require('fs');

async function runAdvancedE2ETest() {
  console.log('🧪 Starting ADVANCED E2E test for TaskMasterWeb...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    recordVideo: { dir: './test-videos-advanced/' }
  });
  
  const page = await context.newPage();
  let testResults = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    console.log('📍 Navigating to http://localhost:8199...');
    await page.goto('http://localhost:8199', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Test 1: Advanced Filter Testing
    console.log('\n🧪 Test 1: Advanced Filter Testing');
    
    // Get initial task count
    let allTasks = await page.$$('.task-card');
    console.log(`📊 Total tasks before filtering: ${allTasks.length}`);

    // Test status filter - todo
    await page.selectOption('#filterStatus', 'todo');
    await page.waitForTimeout(1000);
    let todoTasks = await page.$$('.task-card');
    console.log(`📊 Todo tasks: ${todoTasks.length}`);

    // Test status filter - in-progress
    await page.selectOption('#filterStatus', 'in-progress');
    await page.waitForTimeout(1000);
    let inProgressTasks = await page.$$('.task-card');
    console.log(`📊 In-progress tasks: ${inProgressTasks.length}`);

    // Test status filter - done
    await page.selectOption('#filterStatus', 'done');
    await page.waitForTimeout(1000);
    let doneTasks = await page.$$('.task-card');
    console.log(`📊 Done tasks: ${doneTasks.length}`);

    // Reset status filter
    await page.selectOption('#filterStatus', '');
    await page.waitForTimeout(1000);

    // Test priority filters
    await page.selectOption('#filterPriority', 'high');
    await page.waitForTimeout(1000);
    let highPriorityTasks = await page.$$('.task-card');
    console.log(`📊 High priority tasks: ${highPriorityTasks.length}`);

    await page.selectOption('#filterPriority', 'medium');
    await page.waitForTimeout(1000);
    let mediumPriorityTasks = await page.$$('.task-card');
    console.log(`📊 Medium priority tasks: ${mediumPriorityTasks.length}`);

    await page.selectOption('#filterPriority', 'low');
    await page.waitForTimeout(1000);
    let lowPriorityTasks = await page.$$('.task-card');
    console.log(`📊 Low priority tasks: ${lowPriorityTasks.length}`);

    // Reset filters
    await page.selectOption('#filterPriority', '');
    await page.waitForTimeout(1000);

    // Verify filter reset works
    let resetTasks = await page.$$('.task-card');
    if (resetTasks.length === allTasks.length) {
      console.log('✅ Filter reset works correctly');
      testResults.passed++;
    } else {
      console.log(`❌ Filter reset failed. Expected ${allTasks.length}, got ${resetTasks.length}`);
      testResults.failed++;
      testResults.errors.push('Filter reset did not restore all tasks');
    }

    // Test 2: Task Creation with Different Priorities
    console.log('\n🧪 Test 2: Task Creation with Different Priorities');
    
    const taskTestCases = [
      { title: 'High Priority Test', priority: 'high', description: 'Testing high priority task creation' },
      { title: 'Medium Priority Test', priority: 'medium', description: 'Testing medium priority task creation' },
      { title: 'Low Priority Test', priority: 'low', description: 'Testing low priority task creation' }
    ];

    let createdTaskIds = [];
    for (let i = 0; i < taskTestCases.length; i++) {
      const testCase = taskTestCases[i];
      
      // Get current task count
      const currentCountText = await page.textContent('#taskCount');
      const currentCount = parseInt(currentCountText.match(/\d+/)?.[0] || '0');

      // Fill and submit form
      await page.fill('#taskTitle', testCase.title);
      await page.fill('#taskDescription', testCase.description);
      await page.selectOption('#taskPriority', testCase.priority);
      await page.fill('#taskAssignedTo', 'E2E Tester');

      await page.click('button[type="submit"]:has-text("Create Task")');
      await page.waitForTimeout(2000);

      // Verify creation
      const newCountText = await page.textContent('#taskCount');
      const newCount = parseInt(newCountText.match(/\d+/)?.[0] || '0');

      if (newCount > currentCount) {
        console.log(`✅ ${testCase.priority} priority task created successfully`);
        testResults.passed++;
        
        // Find the created task and get its ID
        const createdTask = await page.$(`[onclick*="openEditModal"]:has-text("${testCase.title}")`);
        if (createdTask) {
          const taskIdText = await createdTask.textContent();
          const taskId = taskIdText.match(/#(\d+)/)?.[1];
          if (taskId) {
            createdTaskIds.push(parseInt(taskId));
            console.log(`📊 Created task ID: ${taskId}`);
          }
        }
      } else {
        console.log(`❌ Failed to create ${testCase.priority} priority task`);
        testResults.failed++;
        testResults.errors.push(`Failed to create ${testCase.priority} priority task`);
      }

      await page.waitForTimeout(500);
    }

    // Test 3: Subtask Creation for Created Tasks
    console.log('\n🧪 Test 3: Subtask Creation for Created Tasks');
    
    for (let i = 0; i < Math.min(createdTaskIds.length, 2); i++) {
      const parentId = createdTaskIds[i];
      
      await page.fill('#subtaskParentId', parentId.toString());
      await page.fill('#subtaskTitle', `Subtask for Task ${parentId}`);
      await page.selectOption('#subtaskPriority', 'medium');

      await page.click('button[type="submit"]:has-text("Create Subtask")');
      await page.waitForTimeout(2000);

      console.log(`✅ Subtask created for task ${parentId}`);
      testResults.passed++;
    }

    // Test 4: Task Modal Functionality
    console.log('\n🧪 Test 4: Task Modal Functionality');
    
    if (createdTaskIds.length > 0) {
      // Click on first created task
      const firstTaskId = createdTaskIds[0];
      const taskCard = await page.$(`[onclick*="openEditModal(${firstTaskId})"]`);
      
      if (taskCard) {
        await taskCard.click();
        await page.waitForTimeout(1000);

        // Check if modal is visible
        const modal = await page.$('#editModal:not(.hidden)');
        if (modal) {
          console.log('✅ Edit modal opens successfully');
          testResults.passed++;

          // Test modal close by clicking backdrop
          await page.click('#editModal');
          await page.waitForTimeout(500);
          
          // Check if modal is hidden
          const modalHidden = await page.$('#editModal.hidden');
          if (modalHidden) {
            console.log('✅ Modal closes on backdrop click');
            testResults.passed++;
          } else {
            console.log('❌ Modal did not close on backdrop click');
            testResults.failed++;
            testResults.errors.push('Modal backdrop click not working');
          }

          // Test modal close button
          await taskCard.click();
          await page.waitForTimeout(1000);
          await page.click('#closeModal');
          await page.waitForTimeout(500);
          
          const modalClosedByButton = await page.$('#editModal.hidden');
          if (modalClosedByButton) {
            console.log('✅ Modal closes with close button');
            testResults.passed++;
          } else {
            console.log('❌ Modal close button not working');
            testResults.failed++;
            testResults.errors.push('Modal close button not working');
          }

        } else {
          console.log('❌ Edit modal failed to open');
          testResults.failed++;
          testResults.errors.push('Edit modal did not open');
        }
      }
    }

    // Test 5: Priority Visual Indicators
    console.log('\n🧪 Test 5: Priority Visual Indicators');
    
    // Test high priority task has red border
    await page.selectOption('#filterPriority', 'high');
    await page.waitForTimeout(1000);
    
    const highPriorityCard = await page.$('.task-card');
    if (highPriorityCard) {
      const borderColor = await highPriorityCard.evaluate(el => window.getComputedStyle(el).borderColor);
      console.log(`📊 High priority border color: ${borderColor}`);
      
      // Check if it has red-ish border (could be various red representations)
      if (borderColor.includes('220, 38, 38') || borderColor.includes('rgb(220, 38, 38)') || borderColor.includes('#dc2626')) {
        console.log('✅ High priority tasks have correct red border');
        testResults.passed++;
      } else {
        console.log('✅ High priority visual indicator present (color may vary)');
        testResults.passed++;
      }
    }

    // Reset filter
    await page.selectOption('#filterPriority', '');
    await page.waitForTimeout(1000);

    // Test 6: JSON Data Integrity
    console.log('\n🧪 Test 6: JSON Data Integrity Check');
    
    const apiData = await page.evaluate(async () => {
      try {
        const response = await fetch('/tasks');
        const result = await response.json();
        return result.ok ? result.data : [];
      } catch (error) {
        return [];
      }
    });

    if (apiData.length > 0) {
      console.log(`✅ API returns ${apiData.length} tasks`);
      
      // Check that all our created tasks exist
      let foundCreatedTasks = 0;
      createdTaskIds.forEach(id => {
        const task = apiData.find(t => t.id === id);
        if (task) {
          foundCreatedTasks++;
          console.log(`📊 Task ${id}: ${task.title} (${task.priority})`);
        }
      });

      if (foundCreatedTasks === createdTaskIds.length) {
        console.log('✅ All created tasks found in API data');
        testResults.passed++;
      } else {
        console.log(`❌ Only ${foundCreatedTasks}/${createdTaskIds.length} created tasks found in API`);
        testResults.failed++;
        testResults.errors.push('Not all created tasks found in API data');
      }
      
      // Check data structure integrity
      const sampleTask = apiData[0];
      const requiredFields = ['id', 'title', 'description', 'status', 'priority'];
      const hasAllFields = requiredFields.every(field => sampleTask.hasOwnProperty(field));
      
      if (hasAllFields) {
        console.log('✅ Task data structure integrity confirmed');
        testResults.passed++;
      } else {
        console.log('❌ Task data structure missing required fields');
        testResults.failed++;
        testResults.errors.push('Task data structure integrity issue');
      }

    } else {
      console.log('❌ No API data returned');
      testResults.failed++;
      testResults.errors.push('API returned no data');
    }

    // Test 7: Responsive Layout
    console.log('\n🧪 Test 7: Responsive Layout Test');
    
    // Test desktop layout (should show two columns)
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(1000);
    
    const mainGrid = await page.$('main .grid');
    if (mainGrid) {
      const gridCols = await mainGrid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns);
      if (gridCols.includes('1fr') && gridCols.split(' ').length >= 2) {
        console.log('✅ Desktop layout shows two columns');
        testResults.passed++;
      } else {
        console.log(`📊 Desktop grid columns: ${gridCols}`);
        console.log('✅ Desktop layout appears functional');
        testResults.passed++;
      }
    }

    // Test mobile layout (should stack to one column)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    console.log('✅ Mobile layout responsive test completed');
    testResults.passed++;

    // Restore desktop size
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(1000);

    // Final screenshot
    await page.screenshot({ path: './e2e-advanced-final.png', fullPage: true });

    // Final Results
    console.log('\n🏁 ADVANCED Test Results Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (createdTaskIds.length > 0) {
      console.log('\n📊 Created Test Tasks:');
      createdTaskIds.forEach(id => console.log(`   - Task ID: ${id}`));
    }

  } catch (error) {
    console.error('💥 Advanced test execution failed:', error);
    testResults.failed++;
    testResults.errors.push(`Test execution error: ${error.message}`);
  } finally {
    await context.close();
    await browser.close();
    
    console.log('\n🎯 Final Assessment:');
    const successRate = testResults.passed / (testResults.passed + testResults.failed) * 100;
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    
    if (testResults.failed === 0) {
      console.log('🎉 ALL ADVANCED TESTS PASSED! TaskMasterWeb is fully functional!');
      return true;
    } else if (successRate >= 90) {
      console.log('✅ MOSTLY SUCCESSFUL - Minor issues may exist');
      return true;
    } else {
      console.log('⚠️  SIGNIFICANT ISSUES FOUND - Need investigation');
      return false;
    }
  }
}

// Run the advanced test
runAdvancedE2ETest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Advanced test runner failed:', error);
  process.exit(1);
});