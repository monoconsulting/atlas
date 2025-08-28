const projects = [
    {
        slug: "atlas",
        name: "Atlas Knowledge Management System",
        path: "/projects/Atlas",
        description: "AI-powered knowledge base and documentation system"
    },
    {
        slug: "kbwhisper",
        name: "KB Whisper Transcription Service", 
        path: "/projects/KBWHISPER",
        description: "Whisper-based audio transcription and processing system"
    },
    {
        slug: "n8nv2",
        name: "N8N Workflow Automation v2",
        path: "/projects/N8Nv2", 
        description: "Advanced workflow automation and integration platform"
    },
    {
        slug: "fortigatelog",
        name: "Fortigate Log Analysis System",
        path: "/projects/fortigatelog",
        description: "Security log processing and analysis tool for Fortigate firewalls"
    },
    {
        slug: "mailscanner", 
        name: "Mail Scanner and Processor",
        path: "/projects/mailscanner",
        description: "Email processing and analysis system"
    },
    {
        slug: "n8n-full-template",
        name: "N8N Full Template System",
        path: "/projects/n8n_full_template", 
        description: "Complete N8N automation template and configuration system"
    },
    {
        slug: "n8n-template",
        name: "N8N Template Base",
        path: "/projects/n8n_template",
        description: "Base N8N workflow template system"
    },
    {
        slug: "ollama",
        name: "Ollama Local AI Server",
        path: "/projects/ollama",
        description: "Local AI model hosting and management system"
    },
    {
        slug: "primosten",
        name: "Primosten Mono Website",
        path: "/projects/primosten.mono.se", 
        description: "React-based website with MCP integration"
    },
    {
        slug: "transkript2", 
        name: "Transkript2 Meeting Transcription System",
        path: "/projects/transkript2",
        description: "Meeting transcription and management system with AI integration"
    }
];

async function restoreAllProjects() {
    console.log('🔄 Restoring all projects...');
    
    const results = [];
    
    for (const project of projects) {
        try {
            console.log(`📁 Restoring: ${project.name}...`);
            
            const response = await fetch('http://localhost:8199/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...project,
                    active: true
                })
            });
            
            const result = await response.json();
            
            if (result.ok) {
                results.push({
                    slug: project.slug,
                    name: project.name,
                    status: '✅ SUCCESS'
                });
                console.log(`   ✅ ${project.slug}: SUCCESS`);
            } else {
                results.push({
                    slug: project.slug,
                    name: project.name, 
                    status: '❌ FAILED',
                    error: result.error || 'Unknown error'
                });
                console.log(`   ❌ ${project.slug}: FAILED - ${result.error || 'Unknown error'}`);
            }
            
        } catch (error) {
            results.push({
                slug: project.slug,
                name: project.name,
                status: '❌ ERROR',
                error: error.message
            });
            console.log(`   ❌ ${project.slug}: ERROR - ${error.message}`);
        }
    }
    
    console.log('\n📊 RESTORATION SUMMARY:');
    console.log('========================');
    
    let successCount = 0;
    let failCount = 0;
    
    results.forEach(result => {
        console.log(`${result.status} ${result.slug} - ${result.name}`);
        if (result.error) {
            console.log(`     Error: ${result.error}`);
        }
        
        if (result.status.includes('SUCCESS')) {
            successCount++;
        } else {
            failCount++;
        }
    });
    
    console.log('========================');
    console.log(`📈 Success: ${successCount}/${results.length} projects restored`);
    console.log(`📉 Failed: ${failCount}/${results.length} projects`);
    
    if (successCount === results.length) {
        console.log('🎉 ALL PROJECTS RESTORED SUCCESSFULLY!');
    } else {
        console.log('⚠️  Some projects failed to restore - see details above');
    }
    
    // Verify by listing all projects
    console.log('\n🔍 Verifying restored projects...');
    
    try {
        const listResponse = await fetch('http://localhost:8199/api/projects');
        const listResult = await listResponse.json();
        
        if (listResult.ok) {
            console.log('📋 Current projects in database:');
            listResult.data.forEach(project => {
                console.log(`   • ${project.slug} - ${project.name}`);
            });
        }
    } catch (error) {
        console.log(`❌ Could not verify projects: ${error.message}`);
    }
    
    return results;
}

// Run the restoration
restoreAllProjects().catch(error => {
    console.error('💥 Fatal error during restoration:', error);
    process.exit(1);
});