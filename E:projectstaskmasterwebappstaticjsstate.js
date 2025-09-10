/**
 * State management module for Atlas Frontend
 * Manages in-memory state: slug, currentTag, tasks, filters, sorting
 * Includes status mapping from Rules §2 and state change notifications
 */

// Status mapping from Rules §2 (7 statuses total)
export const STATUS_MAPPING = {
    'pending': { label: 'Backlog', key: 'backlog', order: 1 },
    'todo': { label: 'Todo', key: 'todo', order: 2 },
    'in-progress': { label: 'In progress', key: 'inprogress', order: 3 },
    'review': { label: 'Review', key: 'review', order: 4 },
    'done': { label: 'Done', key: 'done', order: 5 },
    'deferred': { label: 'Deferred', key: 'deferred', order: 6 },
    'cancelled': { label: 'Cancelled', key: 'cancelled', order: 7 }
};

// Get all status keys in proper order
export const STATUS_ORDER = Object.entries(STATUS_MAPPING)
    .sort(([,a], [,b]) => a.order - b.order)
    .map(([key]) => key);

// Application state
const state = {
    // Project data
    slug: '',
    projectName: 'Loading...',
    currentTag: 'master',
    
    // Task data
    tasks: [],
    allTasks: [], // Unfiltered tasks for filtering pipeline
    
    // Filter state
    filters: {
        status: '',
        priority: '',
        tags: '',
        search: ''
    },
    
    // Sorting state
    sorting: {
        by: 'id',
        order: 'asc'
    },
    
    // UI state
    loading: false,
    error: null,
    
    // Subtask management state
    subtasks: {
        editingTaskId: null,
        createBuffer: []
    }
};

// State change listeners
const listeners = new Set();

/**
 * Subscribe to state changes
 * @param {Function} callback - Function to call when state changes
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

/**
 * Notify all listeners of state change
 * @param {string} type - Type of change
 * @param {*} payload - Change payload
 */
function notify(type, payload = null) {
    listeners.forEach(callback => {
        try {
            callback(type, payload, state);
        } catch (error) {
            console.error('State listener error:', error);
        }
    });
}

/**
 * Set project slug
 * @param {string} slug - Project slug
 */
export function setSlug(slug) {
    state.slug = slug;
    notify('slug-changed', slug);
}

/**
 * Get project slug
 * @returns {string} Current project slug
 */
export function getSlug() {
    return state.slug;
}

/**
 * Set project name
 * @param {string} name - Project name
 */
export function setProjectName(name) {
    state.projectName = name;
    notify('project-name-changed', name);
}

/**
 * Get project name
 * @returns {string} Current project name
 */
export function getProjectName() {
    return state.projectName;
}

/**
 * Set current tag
 * @param {string} tag - Tag name
 */
export function setCurrentTag(tag) {
    state.currentTag = tag;
    notify('current-tag-changed', tag);
}

/**
 * Get current tag
 * @returns {string} Current tag
 */
export function getCurrentTag() {
    return state.currentTag;
}

/**
 * Set all tasks and normalize data
 * @param {Array} tasks - Array of task objects
 */
export function setTasks(tasks) {
    // Normalize tasks and ensure all required fields exist
    const normalizedTasks = tasks
        .filter(task => !task.deleted) // Filter out deleted tasks
        .map(task => ({
            id: task.id,
            title: task.title || 'Untitled Task',
            description: task.description || '',
            status: task.status || 'todo',
            priority: task.priority || 'medium',
            due_date: task.due_date || null,
            assigned_to: task.assigned_to || null,
            estimate: task.estimate || null,
            labels: Array.isArray(task.labels) ? task.labels : [],
            dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
            subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
            created_at: task.created_at || new Date().toISOString(),
            updated_at: task.updated_at || new Date().toISOString(),
            tag: task.tag || state.currentTag
        }));
    
    state.allTasks = normalizedTasks;
    state.tasks = [...normalizedTasks]; // Initially unfiltered
    notify('tasks-changed', normalizedTasks);
}

/**
 * Get all tasks (filtered)
 * @returns {Array} Current filtered tasks
 */
export function getTasks() {
    return state.tasks;
}

/**
 * Get all tasks (unfiltered)
 * @returns {Array} All tasks before filtering
 */
export function getAllTasks() {
    return state.allTasks;
}

/**
 * Get task by ID
 * @param {number} taskId - Task ID
 * @returns {Object|null} Task object or null if not found
 */
export function getTaskById(taskId) {
    return state.allTasks.find(task => task.id === taskId) || null;
}

/**
 * Add or update a single task
 * @param {Object} task - Task object
 */
export function updateTask(task) {
    const index = state.allTasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
        state.allTasks[index] = { ...state.allTasks[index], ...task };
    } else {
        state.allTasks.push(task);
    }
    applyCurrentFilters();
    notify('task-updated', task);
}

/**
 * Remove a task by ID
 * @param {number} taskId - Task ID to remove
 */
export function removeTask(taskId) {
    state.allTasks = state.allTasks.filter(task => task.id !== taskId);
    applyCurrentFilters();
    notify('task-removed', taskId);
}

/**
 * Set filter values
 * @param {Object} filters - Filter values
 */
export function setFilters(filters) {
    state.filters = { ...state.filters, ...filters };
    applyCurrentFilters();
    notify('filters-changed', state.filters);
}

/**
 * Get current filter values
 * @returns {Object} Current filter values
 */
export function getFilters() {
    return { ...state.filters };
}

/**
 * Clear all filters
 */
export function clearFilters() {
    state.filters = {
        status: '',
        priority: '',
        tags: '',
        search: ''
    };
    applyCurrentFilters();
    notify('filters-cleared');
}

/**
 * Set sorting configuration
 * @param {string} by - Sort field
 * @param {string} order - Sort order ('asc' or 'desc')
 */
export function setSorting(by, order = 'asc') {
    state.sorting = { by, order };
    applyCurrentFilters(); // Re-apply filters and sorting
    notify('sorting-changed', state.sorting);
}

/**
 * Get current sorting configuration
 * @returns {Object} Current sorting config
 */
export function getSorting() {
    return { ...state.sorting };
}

/**
 * Apply current filters and sorting to tasks
 */
function applyCurrentFilters() {
    let filtered = [...state.allTasks];
    
    // Apply status filter
    if (state.filters.status) {
        filtered = filtered.filter(task => task.status === state.filters.status);
    }
    
    // Apply priority filter
    if (state.filters.priority) {
        filtered = filtered.filter(task => task.priority === state.filters.priority);
    }
    
    // Apply tags filter (search in labels array)
    if (state.filters.tags) {
        const tagFilter = state.filters.tags.toLowerCase();
        filtered = filtered.filter(task => 
            task.labels.some(label => label.toLowerCase().includes(tagFilter))
        );
    }
    
    // Apply search filter (title, description, assigned_to)
    if (state.filters.search) {
        const searchTerm = state.filters.search.toLowerCase();
        filtered = filtered.filter(task => {
            const searchableText = `${task.title} ${task.description} ${task.assigned_to || ''}`.toLowerCase();
            return searchableText.includes(searchTerm);
        });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        let aValue = a[state.sorting.by];
        let bValue = b[state.sorting.by];
        
        // Special handling for different field types
        if (state.sorting.by === 'priority') {
            const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            aValue = priorityOrder[aValue] || 0;
            bValue = priorityOrder[bValue] || 0;
        } else if (state.sorting.by === 'id') {
            aValue = parseInt(aValue) || 0;
            bValue = parseInt(bValue) || 0;
        } else if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = (bValue || '').toLowerCase();
        }
        
        if (aValue < bValue) {
            return state.sorting.order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return state.sorting.order === 'asc' ? 1 : -1;
        }
        return 0;
    });
    
    state.tasks = filtered;
    notify('tasks-filtered', { 
        total: state.allTasks.length, 
        filtered: filtered.length 
    });
}

/**
 * Get task counts by status
 * @param {Array} tasks - Optional tasks array, defaults to current filtered tasks
 * @returns {Object} Status counts object
 */
export function getStatusCounts(tasks = null) {
    const tasksToCount = tasks || state.tasks;
    const counts = {};
    
    // Initialize all status counts to 0
    Object.keys(STATUS_MAPPING).forEach(status => {
        const key = STATUS_MAPPING[status].key;
        counts[key] = 0;
    });
    
    // Count tasks by status
    tasksToCount.forEach(task => {
        const statusInfo = STATUS_MAPPING[task.status];
        if (statusInfo) {
            counts[statusInfo.key]++;
        }
    });
    
    return counts;
}

/**
 * Get present statuses in current tasks (for dynamic column generation)
 * @returns {Array} Array of present status keys in proper order
 */
export function getPresentStatuses() {
    const presentStatuses = new Set();
    state.tasks.forEach(task => {
        if (STATUS_MAPPING[task.status]) {
            presentStatuses.add(task.status);
        }
    });
    
    // Return in proper order, including empty statuses for complete columns
    return STATUS_ORDER.filter(status => presentStatuses.has(status) || true); // Show all columns
}

/**
 * Get distinct tags from all tasks
 * @returns {Array} Array of unique tags
 */
export function getDistinctTags() {
    const tags = new Set();
    state.allTasks.forEach(task => {
        task.labels.forEach(label => tags.add(label));
    });
    return Array.from(tags).sort();
}

/**
 * Set loading state
 * @param {boolean} loading - Loading state
 */
export function setLoading(loading) {
    state.loading = loading;
    notify('loading-changed', loading);
}

/**
 * Get loading state
 * @returns {boolean} Current loading state
 */
export function getLoading() {
    return state.loading;
}

/**
 * Set error state
 * @param {string|Error|null} error - Error message or object
 */
export function setError(error) {
    state.error = error;
    notify('error-changed', error);
}

/**
 * Get error state
 * @returns {string|Error|null} Current error
 */
export function getError() {
    return state.error;
}

/**
 * Clear error state
 */
export function clearError() {
    state.error = null;
    notify('error-cleared');
}

/**
 * Get complete application state (for debugging)
 * @returns {Object} Complete state object
 */
export function getState() {
    return { ...state };
}

// Export default state management object
export default {
    // Status mapping
    STATUS_MAPPING,
    STATUS_ORDER,
    
    // State management
    subscribe,
    
    // Project state
    setSlug,
    getSlug,
    setProjectName,
    getProjectName,
    setCurrentTag,
    getCurrentTag,
    
    // Task state
    setTasks,
    getTasks,
    getAllTasks,
    getTaskById,
    updateTask,
    removeTask,
    
    // Filter state
    setFilters,
    getFilters,
    clearFilters,
    
    // Sorting state
    setSorting,
    getSorting,
    
    // Computed state
    getStatusCounts,
    getPresentStatuses,
    getDistinctTags,
    
    // UI state
    setLoading,
    getLoading,
    setError,
    getError,
    clearError,
    
    // Debug
    getState
};