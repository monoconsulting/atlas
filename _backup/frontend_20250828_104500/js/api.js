// api.js - API interaction module for Atlas Task Management
// Handles all HTTP communications with the FastAPI backend

const API_BASE = '';

class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData = null;
        
        if (contentType && contentType.includes('application/json')) {
            try {
                errorData = await response.json();
                errorMessage = errorData.message || errorData.detail || errorMessage;
            } catch (e) {
                // JSON parse failed, use default error message
            }
        }
        
        throw new APIError(errorMessage, response.status, errorData);
    }
    
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }
    
    return await response.text();
}

function makeRequest(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    
    const requestOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };
    
    return fetch(`${API_BASE}${url}`, requestOptions)
        .then(handleResponse)
        .catch(error => {
            if (error instanceof APIError) {
                throw error;
            }
            // Network or other fetch errors
            throw new APIError(`Network error: ${error.message}`, 0, null);
        });
}

export async function fetchInfo() {
    try {
        return await makeRequest('/info');
    } catch (error) {
        console.error('Failed to fetch info:', error);
        throw error;
    }
}

export async function fetchTasks(tag = null) {
    try {
        const url = tag ? `/tasks?tag=${encodeURIComponent(tag)}` : '/tasks';
        return await makeRequest(url);
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        throw error;
    }
}

export async function fetchTask(taskId, tag = null) {
    try {
        const url = tag ? `/task/${taskId}?tag=${encodeURIComponent(tag)}` : `/task/${taskId}`;
        return await makeRequest(url);
    } catch (error) {
        console.error(`Failed to fetch task ${taskId}:`, error);
        throw error;
    }
}

export async function createTask(taskData) {
    try {
        return await makeRequest('/task', {
            method: 'POST',
            body: JSON.stringify(taskData),
        });
    } catch (error) {
        console.error('Failed to create task:', error);
        throw error;
    }
}

export async function updateTask(taskId, taskData) {
    try {
        return await makeRequest(`/task/${taskId}`, {
            method: 'PATCH',
            body: JSON.stringify(taskData),
        });
    } catch (error) {
        console.error(`Failed to update task ${taskId}:`, error);
        throw error;
    }
}

export async function createSubtask(taskId, subtaskData) {
    try {
        return await makeRequest(`/task/${taskId}/subtask`, {
            method: 'POST',
            body: JSON.stringify(subtaskData),
        });
    } catch (error) {
        console.error(`Failed to create subtask for task ${taskId}:`, error);
        throw error;
    }
}

export async function updateSubtask(taskId, subtaskId, subtaskData) {
    try {
        return await makeRequest(`/task/${taskId}/subtask/${subtaskId}`, {
            method: 'PATCH',
            body: JSON.stringify(subtaskData),
        });
    } catch (error) {
        console.error(`Failed to update subtask ${subtaskId} for task ${taskId}:`, error);
        throw error;
    }
}

export async function deleteTask(taskId) {
    try {
        return await makeRequest(`/task/${taskId}`, {
            method: 'DELETE',
        });
    } catch (error) {
        console.error(`Failed to delete task ${taskId}:`, error);
        throw error;
    }
}

export { APIError };