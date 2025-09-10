/**
 * API wrapper module for Atlas Frontend
 * Handles all API routes with project slug routing per Rules §3
 * No global helpers - pure API wrapper functions
 */

let currentSlug = '';

/**
 * Set the current project slug for all API calls
 * @param {string} slug - Project slug from URL
 */
export function setProjectSlug(slug) {
    currentSlug = slug;
}

/**
 * Get the current project slug
 * @returns {string} Current project slug
 */
export function getProjectSlug() {
    return currentSlug;
}

/**
 * Build API URL with project slug routing
 * @param {string} endpoint - API endpoint (e.g., '/info', '/tasks')
 * @returns {string} Full API URL with slug routing
 */
function buildApiUrl(endpoint) {
    if (currentSlug) {
        return `/${currentSlug}${endpoint}`;
    }
    return endpoint;
}

/**
 * Generic fetch wrapper with error handling
 * @param {string} url - API URL
 * @param {object} options - Fetch options
 * @returns {Promise<object>} API response data
 */
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.ok) {
            throw new Error(data.message || 'API operation failed');
        }

        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

/**
 * Get project information
 * GET /{slug}/info → project info (provides {projectName})
 * @returns {Promise<object>} Project info data
 */
export async function getProjectInfo() {
    const url = buildApiUrl('/info');
    return await apiCall(url);
}

/**
 * Get all tasks for the project
 * GET /{slug}/tasks?tag=<optional> → { ok: true, data: Task[] }
 * @param {string|null} tag - Optional tag filter
 * @returns {Promise<object>} Tasks data
 */
export async function getTasks(tag = null) {
    let url = buildApiUrl('/tasks');
    if (tag) {
        url += `?tag=${encodeURIComponent(tag)}`;
    }
    return await apiCall(url);
}

/**
 * Get a specific task by ID
 * GET /{slug}/task/{id}?tag=<optional>
 * @param {number} taskId - Task ID
 * @param {string|null} tag - Optional tag filter
 * @returns {Promise<object>} Task data
 */
export async function getTask(taskId, tag = null) {
    let url = buildApiUrl(`/task/${taskId}`);
    if (tag) {
        url += `?tag=${encodeURIComponent(tag)}`;
    }
    return await apiCall(url);
}

/**
 * Create a new parent task
 * POST /{slug}/task → create parent task (returns created task with server-assigned id)
 * @param {object} taskData - Task creation data
 * @returns {Promise<object>} Created task data
 */
export async function createTask(taskData) {
    const url = buildApiUrl('/task');
    return await apiCall(url, {
        method: 'POST',
        body: JSON.stringify(taskData)
    });
}

/**
 * Update an existing parent task
 * PUT /{slug}/task/{taskId} → update parent task
 * @param {number} taskId - Task ID to update
 * @param {object} updateData - Update data
 * @returns {Promise<object>} Updated task data
 */
export async function updateTask(taskId, updateData) {
    const url = buildApiUrl(`/task/${taskId}`);
    return await apiCall(url, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
    });
}

/**
 * Create a new subtask
 * POST /{slug}/task/{taskId}/subtask → create subtask (returns created subtask with server-assigned id 1..8)
 * @param {number} taskId - Parent task ID
 * @param {object} subtaskData - Subtask creation data
 * @returns {Promise<object>} Created subtask data
 */
export async function createSubtask(taskId, subtaskData) {
    const url = buildApiUrl(`/task/${taskId}/subtask`);
    return await apiCall(url, {
        method: 'POST',
        body: JSON.stringify({
            parent_id: taskId,
            ...subtaskData
        })
    });
}

/**
 * Update an existing subtask
 * PUT /{slug}/task/{taskId}/subtask/{subId} → update subtask
 * @param {number} taskId - Parent task ID
 * @param {number} subtaskId - Subtask ID
 * @param {object} updateData - Update data
 * @returns {Promise<object>} Updated subtask data
 */
export async function updateSubtask(taskId, subtaskId, updateData) {
    const url = buildApiUrl(`/task/${taskId}/subtask/${subtaskId}`);
    return await apiCall(url, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
    });
}

/**
 * Delete a task (soft delete)
 * @param {number} taskId - Task ID to delete
 * @returns {Promise<object>} Delete confirmation
 */
export async function deleteTask(taskId) {
    const url = buildApiUrl(`/task/${taskId}`);
    return await apiCall(url, {
        method: 'PATCH',
        body: JSON.stringify({ deleted: true })
    });
}

/**
 * Health check endpoint
 * @returns {Promise<object>} Health status
 */
export async function healthCheck() {
    return await apiCall('/health');
}

// Export API functions for use by other modules
export default {
    setProjectSlug,
    getProjectSlug,
    getProjectInfo,
    getTasks,
    getTask,
    createTask,
    updateTask,
    createSubtask,
    updateSubtask,
    deleteTask,
    healthCheck
};