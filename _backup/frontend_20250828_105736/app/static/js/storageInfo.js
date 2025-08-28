export async function loadStorageInfo(getApiUrl) {
    try {
        const response = await fetch(getApiUrl('/info'));
        const data = await response.json();
        if (data.ok) {
            document.getElementById('storageInfo').textContent = JSON.stringify(data.data, null, 2);
            document.getElementById('projectName').textContent = 'TASK-MASTER-AI ' + (data.data.project_name || 'Unknown');
        } else {
            document.getElementById('storageInfo').textContent = 'Error loading storage info';
        }
    } catch (error) {
        document.getElementById('storageInfo').textContent = 'Failed to load storage info: ' + error.message;
    }
}