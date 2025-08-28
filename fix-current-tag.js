const fs = require('fs');

// This script fixes the current tag issue by setting it to 'master' where the tasks actually are

console.log('🔧 Fixing current tag issue...');

// The state file should be at this path inside the container
const stateFilePath = 'E:/projects/transkript2/.taskmaster/state.json';

try {
    // Check if state file exists
    if (fs.existsSync(stateFilePath)) {
        const stateData = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
        console.log(`Current tag: ${stateData.currentTag}`);
        
        // Change current tag to master where the tasks are
        stateData.currentTag = 'master';
        
        // Write back to file
        fs.writeFileSync(stateFilePath, JSON.stringify(stateData, null, 2));
        console.log('✅ Current tag changed to "master"');
        console.log('Now the interface should show the 125 tasks from the master tag');
    } else {
        console.log('❌ State file not found at:', stateFilePath);
        console.log('Creating new state file with master tag...');
        
        const newState = {
            currentTag: 'master'
        };
        
        fs.writeFileSync(stateFilePath, JSON.stringify(newState, null, 2));
        console.log('✅ New state file created with master tag');
    }
} catch (error) {
    console.error('❌ Error fixing current tag:', error.message);
    console.log('\nTrying alternative approach - using curl to set via API...');
    
    // Alternative: try to use API if available
    const { execSync } = require('child_process');
    
    try {
        console.log('Attempting to switch current tag via API call...');
        // This might not exist, but worth trying
        const result = execSync('curl -X POST http://localhost:8199/transkript2/switch-tag -H "Content-Type: application/json" -d \'{"tag": "master"}\'', { encoding: 'utf8' });
        console.log('API Response:', result);
    } catch (apiError) {
        console.log('API approach failed, will need container access to fix state file');
        
        // Instructions for manual fix
        console.log('\n📋 MANUAL FIX INSTRUCTIONS:');
        console.log('1. The current tag is "transkript" but tasks are in "master"');  
        console.log('2. Either modify the state.json file inside the container');
        console.log('3. Or create an API endpoint to switch current tag');
        console.log('4. Tasks are available at: http://localhost:8199/transkript2/tasks?tag=master');
    }
}