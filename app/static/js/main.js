/**
 * Main bootstrap module for Atlas Frontend
 * Coordinates api, state, and render modules
 * Handles initialization, event wiring, and modal lifecycle
 */

import * as api from './api.js';
import * as state from './state.js';
import * as render from './render.js';

// Global references for HTML onclick handlers
window.openEditModal = openEditModal;
window.deleteTask = deleteTask;

/**
 * Detect project slug from URL path
 * @returns {string|null} Project slug or null
 */
function detectProjectSlug() {
    const path = window.location.pathname;
    const parts = path.split('/');
    if (parts.length > 1 && parts[1] !== '') {
        return parts[1];
    }
    return null;
}

/**
 * Initialize the application
 */
async function initialize() {
    try {
        render.showSpinner();
        
        // Detect and set project slug
        const slug = detectProjectSlug();
        if (slug) {
            api.setProjectSlug(slug);
            state.setSlug(slug);
        }
        
        // Load initial data
        await loadProjectInfo();
        await loadTasks();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup state listeners
        setupStateListeners();
        
        // Initialize sorting from HTML dropdown
        handleSortingChange();
        
        render.hideSpinner();
        
    } catch (error) {
        console.error('Initialization failed:', error);
        render.hideSpinner();
        render.showError('Failed to initialize application: ' + error.message);
    }
}

/**
 * Load project information
 */
async function loadProjectInfo() {
    try {
        const response = await api.getProjectInfo();
        if (response.ok && response.data) {
            const projectName = response.data.project_name || response.data.projectName || 'Unknown Project';
            state.setProjectName(projectName);
            
            // Update project name in header
            const projectNameElement = document.getElementById('projectName');
            if (projectNameElement) {
                projectNameElement.textContent = projectName;
            }
        }
    } catch (error) {
        console.error('Failed to load project info:', error);
        render.showError('Failed to load project information', error.type || 'network');
    }
}

/**
 * Load tasks data
 */
async function loadTasks() {
    try {
        const response = await api.getTasks();
        
        if (response.ok && response.data) {
            state.setTasks(response.data);
            updateUI();
        }
    } catch (error) {
        console.error('Failed to load tasks:', error);
        render.showError('Failed to load tasks', error.type || 'server');
    }
}

/**
 * Update the UI based on current state
 */
function updateUI() {
    const tasks = state.getTasks();
    const counts = state.getStatusCounts(tasks);
    const presentStatuses = state.getPresentStatuses();
    
    // Update header counters
    render.renderHeaderCounters(counts);
    
    // Update Kanban columns
    render.renderKanbanColumns(tasks, presentStatuses);
    
    // Update tag filter options
    updateTagFilterOptions();
}

/**
 * Update tag filter dropdown options
 */
function updateTagFilterOptions() {
    const tags = state.getDistinctTags();
    const tagsSelect = document.getElementById('filterTags');
    
    if (tagsSelect) {
        // Keep current selection
        const currentValue = tagsSelect.value;
        
        // Update options
        tagsSelect.innerHTML = '<option value="">All Tags</option>' + render.renderTagOptions(tags);
        
        // Restore selection if still valid
        if (currentValue && tags.includes(currentValue)) {
            tagsSelect.value = currentValue;
        }
    }
}

/**
 * Setup state change listeners
 */
function setupStateListeners() {
    state.subscribe((type, payload, currentState) => {
        switch (type) {
            case 'tasks-changed':
            case 'tasks-filtered':
                updateUI();
                break;
                
            case 'filters-changed':
                render.updateFilterIndicators(payload);
                break;
                
            case 'filters-cleared':
                render.updateFilterIndicators({ status: '', priority: '', tags: '', search: '' });
                break;
                
            case 'loading-changed':
                if (payload) {
                    render.showSpinner();
                } else {
                    render.hideSpinner();
                }
                break;
                
            case 'error-changed':
                if (payload) {
                    render.showError(payload.message || payload.toString());
                }
                break;
        }
    });
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Action buttons
    document.getElementById('createNewTaskBtn')?.addEventListener('click', () => {
        openTaskModal('create');
    });
    
    document.getElementById('createNewStatusBtn')?.addEventListener('click', () => {
        render.showError('Status creation is not yet implemented');
    });
    
    document.getElementById('createNewTagBtn')?.addEventListener('click', () => {
        render.showError('Tag creation is not yet implemented');
    });
    
    // Filter event listeners
    document.getElementById('filterStatus')?.addEventListener('change', handleFilterChange);
    document.getElementById('filterPriority')?.addEventListener('change', handleFilterChange);
    document.getElementById('filterTags')?.addEventListener('change', handleFilterChange);
    document.getElementById('filterSorting')?.addEventListener('change', handleSortingChange);
    document.getElementById('filterSearch')?.addEventListener('input', handleFilterChange);
    document.getElementById('clearFiltersBtn')?.addEventListener('click', handleClearFilters);
    
    // Modal event listeners
    document.getElementById('closeModalBtn')?.addEventListener('click', closeTaskModal);
    document.getElementById('cancelTaskBtn')?.addEventListener('click', closeTaskModal);
    document.getElementById('taskForm')?.addEventListener('submit', handleTaskSubmit);
    document.getElementById('addSubtaskBtn')?.addEventListener('click', addSubtask);
    
    // Error banner close
    document.getElementById('closeErrorBtn')?.addEventListener('click', render.hideError);
    
    // Modal backdrop click
    document.getElementById('taskModal')?.addEventListener('click', handleModalBackdropClick);
    
    // ESC key to close modals
    document.addEventListener('keydown', handleKeyDown);
}

/**
 * Handle filter changes
 */
function handleFilterChange() {
    const filters = {
        status: document.getElementById('filterStatus')?.value || '',
        priority: document.getElementById('filterPriority')?.value || '',
        tags: document.getElementById('filterTags')?.value || '',
        search: document.getElementById('filterSearch')?.value || ''
    };
    
    state.setFilters(filters);
    render.updateFilterIndicators(filters);
}

/**
 * Handle sorting changes
 */
function handleSortingChange() {
    const sortingValue = document.getElementById('filterSorting')?.value || 'id-desc';
    const [by, order] = sortingValue.split('-');
    
    state.setSorting(by, order);
}

/**
 * Handle clearing all filters
 */
function handleClearFilters() {
    // Reset all filter controls to default values
    const filterStatus = document.getElementById('filterStatus');
    const filterPriority = document.getElementById('filterPriority');
    const filterTags = document.getElementById('filterTags');
    const filterSearch = document.getElementById('filterSearch');
    
    if (filterStatus) filterStatus.value = '';
    if (filterPriority) filterPriority.value = '';
    if (filterTags) filterTags.value = '';
    if (filterSearch) filterSearch.value = '';
    
    // Clear filters in state (this will trigger the filters-cleared event)
    state.clearFilters();
}

/**
 * Open task modal (create or edit)
 * @param {string} mode - 'create' or 'edit'
 * @param {Object|null} task - Task data for edit mode
 */
function openTaskModal(mode = 'create', task = null) {
    const modal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('taskForm');
    
    if (!modal || !modalTitle || !form) return;
    
    // Set modal title
    modalTitle.textContent = mode === 'create' ? 'Create New Task' : 'Edit Task';
    
    // Reset form
    form.reset();
    
    // Populate form for edit mode
    if (mode === 'edit' && task) {
        document.getElementById('taskTitle').value = task.title || '';
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority || 'medium';
        document.getElementById('taskStatus').value = task.status || 'todo';
        document.getElementById('taskDueDate').value = task.due_date || '';
        document.getElementById('taskAssignedTo').value = task.assigned_to || '';
        document.getElementById('taskEstimate').value = task.estimate || '';
        document.getElementById('taskLabels').value = (task.labels || []).join(', ');
        
        // Store task ID for editing
        form.dataset.taskId = task.id;
        form.dataset.mode = 'edit';
        
        // Populate subtasks
        populateSubtasks(task);
    } else {
        // Clear task ID for create mode
        delete form.dataset.taskId;
        form.dataset.mode = 'create';
        
        // Clear subtasks
        clearSubtasks();
    }
    
    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Open edit modal for specific task
 * @param {number} taskId - Task ID
 */
async function openEditModal(taskId) {
    try {
        const task = state.getTaskById(taskId);
        if (!task) {
            render.showError('Task not found');
            return;
        }
        
        openTaskModal('edit', task);
    } catch (error) {
        console.error('Failed to open edit modal:', error);
        render.showError('Failed to open task editor');
    }
}

/**
 * Close task modal
 */
function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Clear form and subtasks
        document.getElementById('taskForm')?.reset();
        clearSubtasks();
    }
}

/**
 * Handle task form submission
 * @param {Event} event - Form submit event
 */
async function handleTaskSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const mode = form.dataset.mode || 'create';
    const taskId = form.dataset.taskId;
    
    try {
        // Collect form data
        const taskData = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            due_date: document.getElementById('taskDueDate').value || null,
            assigned_to: document.getElementById('taskAssignedTo').value.trim() || null,
            estimate: document.getElementById('taskEstimate').value.trim() || null,
            labels: parseLabels(document.getElementById('taskLabels').value)
        };
        
        if (!taskData.title) {
            render.showError('Task title is required', 'validation');
            return;
        }
        
        // Set button loading state
        const saveBtn = document.getElementById('saveTaskBtn');
        render.setButtonLoading(saveBtn, true, 'Saving...');
        
        let result;
        if (mode === 'create') {
            result = await api.createTask(taskData);
            
            // If task created successfully, create subtasks
            if (result.ok && result.data && result.data.id) {
                await createSubtasksFromModal(result.data.id);
            }
        } else {
            result = await api.updateTask(parseInt(taskId), taskData);
        }
        
        if (result.ok) {
            closeTaskModal();
            await loadTasks(); // Refresh tasks
            render.showSuccess(`Task ${mode === 'create' ? 'created' : 'updated'} successfully`);
        }
        
        render.setButtonLoading(saveBtn, false);
    } catch (error) {
        console.error('Failed to save task:', error);
        const saveBtn = document.getElementById('saveTaskBtn');
        render.setButtonLoading(saveBtn, false);
        render.showError(`Failed to ${mode} task`, error.type || 'server');
    }
}

/**
 * Parse labels from comma-separated string
 * @param {string} labelsStr - Comma-separated labels string
 * @returns {Array} Array of label strings
 */
function parseLabels(labelsStr) {
    if (!labelsStr) return [];
    return labelsStr.split(',').map(label => label.trim()).filter(label => label);
}

/**
 * Create subtasks from modal form data
 * @param {number} taskId - Parent task ID
 */
async function createSubtasksFromModal(taskId) {
    const subtasksList = document.getElementById('subtasksList');
    if (!subtasksList) return;
    
    const subtaskRows = subtasksList.querySelectorAll('[data-testid^="subtask-row-"]');
    
    for (const row of subtaskRows) {
        const titleInput = row.querySelector('[data-field="title"]');
        const descInput = row.querySelector('[data-field="description"]');
        const prioritySelect = row.querySelector('[data-field="priority"]');
        const statusSelect = row.querySelector('[data-field="status"]');
        
        if (titleInput && titleInput.value.trim()) {
            try {
                const subtaskData = {
                    title: titleInput.value.trim(),
                    description: descInput?.value.trim() || '',
                    priority: prioritySelect?.value || 'medium',
                    status: statusSelect?.value || 'todo'
                };
                
                await api.createSubtask(taskId, subtaskData);
            } catch (error) {
                console.error('Failed to create subtask:', error);
                // Continue with remaining subtasks
            }
        }
    }
}

/**
 * Delete a task
 * @param {number} taskId - Task ID to delete
 */
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await api.deleteTask(taskId);
        
        if (result.ok) {
            await loadTasks(); // Refresh tasks
            render.showSuccess('Task deleted successfully');
        }
    } catch (error) {
        console.error('Failed to delete task:', error);
        render.showError('Failed to delete task', error.type || 'server');
    }
}

/**
 * Add a new subtask row to the modal
 */
function addSubtask() {
    const subtasksList = document.getElementById('subtasksList');
    if (!subtasksList) return;
    
    // Check current subtask count
    const currentSubtasks = subtasksList.querySelectorAll('[data-testid^="subtask-row-"]');
    if (currentSubtasks.length >= 8) {
        render.showError('Maximum 8 subtasks per task');
        return;
    }
    
    // Create new subtask row
    const subtaskRow = document.createElement('div');
    subtaskRow.setAttribute('data-testid', `subtask-row-${currentSubtasks.length + 1}`);
    subtaskRow.className = 'bg-slate-900 border border-slate-800 rounded p-4 space-y-3';
    subtaskRow.innerHTML = render.renderAddSubtaskForm(8, currentSubtasks.length);
    
    // Add remove button handler
    const removeBtn = subtaskRow.querySelector('.remove-subtask-btn');
    removeBtn?.addEventListener('click', () => {
        subtaskRow.remove();
        updateSubtaskTestIds();
    });
    
    subtasksList.appendChild(subtaskRow);
    
    // Update "no subtasks" message
    const noSubtasksMsg = subtasksList.querySelector('.text-slate-500.italic');
    if (noSubtasksMsg) {
        noSubtasksMsg.remove();
    }
}

/**
 * Update subtask data-testid attributes after removal
 */
function updateSubtaskTestIds() {
    const subtasksList = document.getElementById('subtasksList');
    if (!subtasksList) return;
    
    const subtaskRows = subtasksList.querySelectorAll('[data-testid^="subtask-row-"]');
    subtaskRows.forEach((row, index) => {
        row.setAttribute('data-testid', `subtask-row-${index + 1}`);
    });
    
    // Show "no subtasks" message if empty
    if (subtaskRows.length === 0) {
        subtasksList.innerHTML = '<p class="text-sm text-slate-500 italic">No subtasks added yet</p>';
    }
}

/**
 * Populate subtasks in modal
 * @param {Object} task - Task with subtasks
 */
function populateSubtasks(task) {
    const subtasksList = document.getElementById('subtasksList');
    if (!subtasksList || !task.subtasks) return;
    
    if (task.subtasks.length === 0) {
        subtasksList.innerHTML = '<p class="text-sm text-slate-500 italic">No subtasks yet</p>';
        return;
    }
    
    subtasksList.innerHTML = render.renderSubtaskRows(task.subtasks, task.id);
    
    // Setup subtask event listeners
    setupSubtaskEventListeners(task.id);
}

/**
 * Setup event listeners for subtask controls
 * @param {number} taskId - Parent task ID
 */
function setupSubtaskEventListeners(taskId) {
    // Status selects
    document.querySelectorAll('.subtask-status-select').forEach(select => {
        select.addEventListener('change', async function() {
            await updateSubtaskField(taskId, this.dataset.subtaskId, 'status', this.value);
        });
    });
    
    // Title inputs
    document.querySelectorAll('.subtask-title-input').forEach(input => {
        input.addEventListener('change', async function() {
            await updateSubtaskField(taskId, this.dataset.subtaskId, 'title', this.value);
        });
    });
    
    // Description textareas
    document.querySelectorAll('.subtask-desc-input').forEach(textarea => {
        textarea.addEventListener('change', async function() {
            await updateSubtaskField(taskId, this.dataset.subtaskId, 'description', this.value);
        });
    });
}

/**
 * Update a subtask field
 * @param {number} taskId - Parent task ID
 * @param {number} subtaskId - Subtask ID
 * @param {string} field - Field name
 * @param {*} value - New value
 */
async function updateSubtaskField(taskId, subtaskId, field, value) {
    try {
        const updateData = { [field]: value };
        await api.updateSubtask(taskId, subtaskId, updateData);
        
        // Refresh tasks to update UI
        await loadTasks();
    } catch (error) {
        console.error('Failed to update subtask:', error);
        render.showError('Failed to update subtask');
    }
}

/**
 * Clear subtasks list
 */
function clearSubtasks() {
    const subtasksList = document.getElementById('subtasksList');
    if (subtasksList) {
        subtasksList.innerHTML = '<p class="text-sm text-slate-500 italic">No subtasks added yet</p>';
    }
}

/**
 * Handle modal backdrop clicks
 * @param {Event} event - Click event
 */
function handleModalBackdropClick(event) {
    if (event.target === event.currentTarget) {
        closeTaskModal();
    }
}

/**
 * Handle keyboard events
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeyDown(event) {
    if (event.key === 'Escape') {
        closeTaskModal();
    }
}

/**
 * Setup loading state cleanup mechanisms
 */
function setupLoadingCleanup() {
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        state.clearAllLoadingStates();
    });
    
    // Cleanup on page hide (mobile/tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            state.clearAllLoadingStates();
        }
    });
    
    // Periodic cleanup check every 60 seconds to catch any stale states
    setInterval(() => {
        const loadingOps = state.getLoadingOperations();
        if (loadingOps.length > 0) {
            console.debug('Periodic cleanup check - current loading operations:', loadingOps);
        }
    }, 60000);
    
    // Global error handler for uncaught promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        render.showError('An unexpected error occurred', 'server');
        // Clear any stale loading states
        state.clearAllLoadingStates();
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initialize();
    setupLoadingCleanup();
});

// Export for debugging
export { initialize, loadTasks, openEditModal, deleteTask };