/**
 * Render module for Atlas Frontend
 * Pure render functions for all UI components
 * Handles header counters, dynamic columns, cards, modals, subtasks
 */

import { STATUS_MAPPING, STATUS_ORDER } from './state.js';

/**
 * Render header counters with proper data-testids
 * @param {Object} counts - Status counts object
 */
export function renderHeaderCounters(counts) {
    const countersContainer = document.querySelector('[data-testid="header-counters"]');
    if (!countersContainer) return;

    // Update each counter with proper data-testid
    Object.entries(STATUS_MAPPING).forEach(([status, info]) => {
        const counter = countersContainer.querySelector(`[data-testid="counter-${info.key}"]`);
        if (counter) {
            const countSpan = counter.querySelector('span.text-white');
            if (countSpan) {
                countSpan.textContent = counts[info.key] || 0;
            }
        }
    });
}

/**
 * Render dynamic Kanban columns based on present statuses
 * @param {Array} tasks - Array of tasks to render
 * @param {Array} presentStatuses - Array of present status keys
 */
export function renderKanbanColumns(tasks, presentStatuses = STATUS_ORDER) {
    const container = document.getElementById('kanbanContainer');
    if (!container) return;

    // Group tasks by status
    const tasksByStatus = {};
    presentStatuses.forEach(status => {
        tasksByStatus[status] = tasks.filter(task => task.status === status);
    });

    // Render columns
    container.innerHTML = presentStatuses.map(status => {
        const statusInfo = STATUS_MAPPING[status];
        const statusTasks = tasksByStatus[status] || [];
        
        return `
            <div data-testid="column-${statusInfo.key}" class="bg-slate-950 rounded-lg border border-slate-800">
                <div class="p-4 border-b border-slate-800 ${getColumnHeaderClass(status)} rounded-t-lg">
                    <div class="flex items-center justify-between">
                        <h2 class="font-medium text-slate-100 flex items-center gap-2">
                            ${getStatusIcon(status)}
                            ${statusInfo.label}
                        </h2>
                        <span class="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                            ${statusTasks.length}
                        </span>
                    </div>
                </div>
                <div class="p-4 min-h-[400px] space-y-3">
                    ${statusTasks.length > 0 
                        ? statusTasks.map(task => renderTaskCard(task)).join('')
                        : '<div class="text-center text-slate-400 py-8">No tasks</div>'
                    }
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Get column header styling class based on status
 * @param {string} status - Status key
 * @returns {string} CSS class
 */
function getColumnHeaderClass(status) {
    const colorMap = {
        'pending': 'bg-slate-900/50',
        'todo': 'bg-slate-900/50',
        'in-progress': 'bg-blue-900/20',
        'review': 'bg-yellow-900/20',
        'done': 'bg-green-900/20',
        'deferred': 'bg-orange-900/20',
        'cancelled': 'bg-red-900/20'
    };
    return colorMap[status] || 'bg-slate-900/50';
}

/**
 * Get status icon
 * @param {string} status - Status key
 * @returns {string} Icon HTML
 */
function getStatusIcon(status) {
    const iconMap = {
        'pending': '<span class="w-3 h-3 bg-slate-500 rounded-full"></span>',
        'todo': '<span class="w-3 h-3 bg-slate-500 rounded-full"></span>',
        'in-progress': '<span class="w-3 h-3 bg-blue-500 rounded-full"></span>',
        'review': '<span class="w-3 h-3 bg-yellow-500 rounded-full"></span>',
        'done': '<span class="w-3 h-3 bg-green-500 rounded-full"></span>',
        'deferred': '<span class="w-3 h-3 bg-orange-500 rounded-full"></span>',
        'cancelled': '<span class="w-3 h-3 bg-red-500 rounded-full"></span>'
    };
    return iconMap[status] || '<span class="w-3 h-3 bg-slate-500 rounded-full"></span>';
}

/**
 * Render a single task card
 * @param {Object} task - Task object
 * @returns {string} HTML string for task card
 */
export function renderTaskCard(task) {
    const priorityClass = getPriorityCardClass(task.priority);
    const priorityColor = getPriorityTextClass(task.priority);

    return `
        <div data-testid="card" class="task-card group relative p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors ${priorityClass}" 
             data-task-id="${task.id}" onclick="window.openEditModal && window.openEditModal(${task.id})">
            <div class="flex items-start justify-between mb-2">
                <span class="text-sm font-semibold text-slate-300">#${task.id}</span>
                <span class="text-xs ${priorityColor} capitalize font-medium">${task.priority}</span>
            </div>
            <h3 class="font-medium text-slate-100 mb-2 text-sm break-words overflow-wrap" style="word-wrap: break-word; overflow-wrap: break-word; white-space: normal; line-height: 1.4;">
                ${escapeHtml(task.title)}
            </h3>
            ${task.description ? `
                <p class="text-xs text-slate-400 mb-2 overflow-hidden break-words max-w-full" style="word-wrap: break-word; overflow-wrap: break-word;">
                    ${escapeHtml(task.description)}
                </p>
            ` : ''}
            ${task.assigned_to ? `
                <div class="text-xs text-slate-500">👤 ${escapeHtml(task.assigned_to)}</div>
            ` : ''}
            ${task.due_date ? `
                <div class="text-xs text-slate-500 mt-1">📅 ${task.due_date}</div>
            ` : ''}
            ${task.estimate ? `
                <div class="text-xs text-slate-500 mt-1">⏱️ ${escapeHtml(task.estimate)}</div>
            ` : ''}
            ${task.labels && task.labels.length > 0 ? `
                <div class="mt-2 flex flex-wrap gap-1">
                    ${task.labels.map(label => `
                        <span class="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded">
                            ${escapeHtml(label)}
                        </span>
                    `).join('')}
                </div>
            ` : ''}
            ${renderSubtasksPreview(task)}
            
            <!-- Delete Button -->
            <button class="absolute bottom-2 right-2 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                    onclick="event.stopPropagation(); window.deleteTask && window.deleteTask(${task.id})"
                    title="Delete task">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </div>
    `;
}

/**
 * Render subtasks preview in task card
 * @param {Object} task - Task object
 * @returns {string} HTML string for subtasks preview
 */
function renderSubtasksPreview(task) {
    if (!task.subtasks || task.subtasks.length === 0) {
        return '';
    }

    return `
        <div class="mt-2 border-t border-slate-700 pt-2">
            <div class="text-xs text-blue-400 mb-1">📂 Subtasks (${task.subtasks.length}):</div>
            ${task.subtasks
                .sort((a, b) => {
                    const aNum = parseInt(a.id.toString().split('.').pop()) || 0;
                    const bNum = parseInt(b.id.toString().split('.').pop()) || 0;
                    return aNum - bNum;
                })
                .slice(0, 3) // Show max 3 in preview
                .map(subtask => `
                    <div class="text-xs text-slate-300 pl-2 py-0.5" title="${escapeHtml(subtask.title)}">
                        <span class="text-slate-500">${subtask.id}.</span> 
                        ${escapeHtml(truncateText(subtask.title, 30))}
                        <span class="text-xs ${getPriorityTextClass(subtask.priority)}">(${subtask.priority})</span>
                        ${subtask.status === 'done' ? '✓' : ''}
                    </div>
                `).join('')}
            ${task.subtasks.length > 3 ? `
                <div class="text-xs text-slate-500 pl-2">...and ${task.subtasks.length - 3} more</div>
            ` : ''}
        </div>
    `;
}

/**
 * Get priority card border class
 * @param {string} priority - Priority level
 * @returns {string} CSS class
 */
function getPriorityCardClass(priority) {
    const classMap = {
        'high': 'border-l-4 border-l-red-500 bg-red-950/20',
        'medium': 'border-l-4 border-l-orange-500 bg-orange-950/20',
        'low': 'border-l-4 border-l-slate-500 bg-slate-900/50'
    };
    return classMap[priority] || 'border-l-4 border-l-slate-500 bg-slate-900/50';
}

/**
 * Get priority text color class
 * @param {string} priority - Priority level
 * @returns {string} CSS class
 */
function getPriorityTextClass(priority) {
    const classMap = {
        'high': 'text-red-400',
        'medium': 'text-orange-400',
        'low': 'text-slate-400'
    };
    return classMap[priority] || 'text-slate-400';
}

/**
 * Render subtask rows for modal
 * @param {Array} subtasks - Array of subtask objects
 * @param {number} taskId - Parent task ID
 * @returns {string} HTML string for subtask rows
 */
export function renderSubtaskRows(subtasks, taskId) {
    if (!subtasks || subtasks.length === 0) {
        return '<p class="text-sm text-slate-500 italic">No subtasks yet</p>';
    }

    // Sort subtasks by ID
    const sortedSubtasks = [...subtasks].sort((a, b) => {
        const aId = typeof a.id === 'number' ? a.id : parseInt(a.id.toString().split('.').pop() || '0');
        const bId = typeof b.id === 'number' ? b.id : parseInt(b.id.toString().split('.').pop() || '0');
        return aId - bId;
    });

    return sortedSubtasks.map((subtask, index) => `
        <div data-testid="subtask-row-${index + 1}" class="bg-slate-900 border border-slate-700 rounded p-3" data-subtask-id="${subtask.id}">
            <div class="flex items-start justify-between mb-2">
                <span class="text-xs text-slate-400 font-mono">#${subtask.id}</span>
                <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-1 rounded ${getPriorityBadgeClass(subtask.priority)}">
                        ${subtask.priority}
                    </span>
                    <select class="text-xs px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 subtask-status-select" 
                            data-task-id="${taskId}" data-subtask-id="${subtask.id}">
                        <option value="todo" ${subtask.status === 'todo' ? 'selected' : ''}>Todo</option>
                        <option value="pending" ${subtask.status === 'pending' ? 'selected' : ''}>Backlog</option>
                        <option value="in-progress" ${subtask.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="review" ${subtask.status === 'review' ? 'selected' : ''}>Review</option>
                        <option value="done" ${subtask.status === 'done' ? 'selected' : ''}>Done</option>
                        <option value="deferred" ${subtask.status === 'deferred' ? 'selected' : ''}>Deferred</option>
                        <option value="cancelled" ${subtask.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </div>
            </div>
            <input type="text" value="${escapeHtml(subtask.title)}" 
                   class="w-full mb-2 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm subtask-title-input"
                   data-task-id="${taskId}" data-subtask-id="${subtask.id}">
            <textarea class="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-xs subtask-desc-input"
                      rows="2" data-task-id="${taskId}" data-subtask-id="${subtask.id}"
                      placeholder="Add description (optional)">${escapeHtml(subtask.description || '')}</textarea>
        </div>
    `).join('');
}

/**
 * Get priority badge class
 * @param {string} priority - Priority level
 * @returns {string} CSS class
 */
function getPriorityBadgeClass(priority) {
    const classMap = {
        'high': 'bg-red-900 text-red-300',
        'medium': 'bg-orange-900 text-orange-300',
        'low': 'bg-slate-800 text-slate-400'
    };
    return classMap[priority] || 'bg-slate-800 text-slate-400';
}

/**
 * Render add subtask form (for Create/Edit modals)
 * @param {number} maxSubtasks - Maximum allowed subtasks (8)
 * @param {number} currentCount - Current subtask count
 * @returns {string} HTML string for add subtask form
 */
export function renderAddSubtaskForm(maxSubtasks = 8, currentCount = 0) {
    const isDisabled = currentCount >= maxSubtasks;
    
    return `
        <div class="bg-slate-900 border border-slate-800 rounded p-4 space-y-3">
            <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium text-slate-300">New Subtask</h4>
                <button type="button" class="text-slate-500 hover:text-red-400 transition-colors remove-subtask-btn">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div>
                <input type="text" placeholder="Subtask title" 
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    data-field="title">
            </div>
            <div>
                <textarea placeholder="Subtask description (optional)" rows="2"
                    class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    data-field="description"></textarea>
            </div>
            <div class="flex gap-2">
                <select class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-100 text-xs" data-field="priority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                </select>
                <select class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-100 text-xs" data-field="status">
                    <option value="pending">Backlog</option>
                    <option value="todo" selected>Todo</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="deferred">Deferred</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
        </div>
    `;
}

/**
 * Render tag options for filter dropdown
 * @param {Array} tags - Array of available tags
 * @returns {string} HTML string for option elements
 */
export function renderTagOptions(tags) {
    return tags.map(tag => 
        `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`
    ).join('');
}

/**
 * Show loading spinner with optional message
 * @param {string} message - Optional loading message
 */
export function showSpinner(message = 'Loading...') {
    const spinner = document.querySelector('[data-testid="spinner"]');
    if (spinner) {
        // Update spinner message if element exists
        const messageElement = spinner.querySelector('span');
        if (messageElement) {
            messageElement.textContent = message;
        }
        spinner.classList.remove('hidden');
    }
}

/**
 * Hide loading spinner
 */
export function hideSpinner() {
    const spinner = document.querySelector('[data-testid="spinner"]');
    if (spinner) {
        spinner.classList.add('hidden');
    }
}

/**
 * Set button loading state
 * @param {string|HTMLElement} buttonSelector - Button selector or element
 * @param {boolean} isLoading - Loading state
 * @param {string} loadingText - Text to show while loading
 */
export function setButtonLoading(buttonSelector, isLoading, loadingText = 'Loading...') {
    const button = typeof buttonSelector === 'string' 
        ? document.querySelector(buttonSelector) 
        : buttonSelector;
    
    if (!button) return;
    
    if (isLoading) {
        // Store original text and disable button
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }
        button.disabled = true;
        button.textContent = loadingText;
        button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        // Restore original text and enable button
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

/**
 * Show error banner with categorization
 * @param {string} message - Error message
 * @param {string} type - Error type ('network', 'validation', 'server', 'info')
 * @param {number} duration - Auto-hide duration in ms (0 = no auto-hide)
 */
export function showError(message, type = 'server', duration = 5000) {
    const errorBanner = document.querySelector('[data-testid="error-banner"]');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorBanner && errorMessage) {
        // Clear any existing auto-hide timeout
        if (errorBanner.hideTimeout) {
            clearTimeout(errorBanner.hideTimeout);
        }
        
        // Categorize error message with user-friendly prefix
        let displayMessage = message;
        switch (type) {
            case 'network':
                displayMessage = `Network Error: ${message}`;
                break;
            case 'validation':
                displayMessage = `Validation Error: ${message}`;
                break;
            case 'server':
                displayMessage = `Server Error: ${message}`;
                break;
            case 'info':
                displayMessage = message; // No prefix for info messages
                break;
        }
        
        errorMessage.textContent = displayMessage;
        
        // Update banner styling based on error type
        errorBanner.className = 'fixed top-20 left-4 right-4 px-4 py-3 rounded-lg z-40 border';
        
        switch (type) {
            case 'network':
                errorBanner.classList.add('bg-orange-900', 'border-orange-700', 'text-orange-100');
                break;
            case 'validation':
                errorBanner.classList.add('bg-yellow-900', 'border-yellow-700', 'text-yellow-100');
                break;
            case 'info':
                errorBanner.classList.add('bg-blue-900', 'border-blue-700', 'text-blue-100');
                break;
            case 'server':
            default:
                errorBanner.classList.add('bg-red-900', 'border-red-700', 'text-red-100');
                break;
        }
        
        errorBanner.classList.remove('hidden');
        
        // Auto-hide after specified duration
        if (duration > 0) {
            errorBanner.hideTimeout = setTimeout(() => {
                hideError();
            }, duration);
        }
    }
}

/**
 * Hide error banner
 */
export function hideError() {
    const errorBanner = document.querySelector('[data-testid="error-banner"]');
    if (errorBanner) {
        errorBanner.classList.add('hidden');
        
        // Clear any pending auto-hide timeout
        if (errorBanner.hideTimeout) {
            clearTimeout(errorBanner.hideTimeout);
            errorBanner.hideTimeout = null;
        }
    }
}

/**
 * Show success message (using error banner with success styling)
 * @param {string} message - Success message
 * @param {number} duration - Auto-hide duration in ms
 */
export function showSuccess(message, duration = 3000) {
    const errorBanner = document.querySelector('[data-testid="error-banner"]');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorBanner && errorMessage) {
        // Clear any existing timeout
        if (errorBanner.hideTimeout) {
            clearTimeout(errorBanner.hideTimeout);
        }
        
        errorMessage.textContent = message;
        
        // Style as success banner
        errorBanner.className = 'fixed top-20 left-4 right-4 bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded-lg z-40';
        errorBanner.classList.remove('hidden');
        
        // Auto-hide after duration
        if (duration > 0) {
            errorBanner.hideTimeout = setTimeout(() => {
                hideError();
            }, duration);
        }
    }
}

/**
 * Update visual indicators for active filters
 * @param {Object} filters - Current filter values
 */
export function updateFilterIndicators(filters) {
    const filterControls = [
        { id: 'filterStatus', key: 'status' },
        { id: 'filterPriority', key: 'priority' },
        { id: 'filterTags', key: 'tags' },
        { id: 'filterSearch', key: 'search' }
    ];

    filterControls.forEach(({ id, key }) => {
        const element = document.getElementById(id);
        if (!element) return;

        const isActive = filters[key] && filters[key] !== '';
        
        if (isActive) {
            // Add visual indicator for active filter
            element.classList.add('ring-2', 'ring-blue-400', 'border-blue-400');
            element.classList.remove('border-slate-600');
        } else {
            // Remove visual indicator for inactive filter
            element.classList.remove('ring-2', 'ring-blue-400', 'border-blue-400');
            element.classList.add('border-slate-600');
        }
    });

    // Show active filter count in filter bar
    updateActiveFilterCount(filters);
}

/**
 * Update active filter count indicator
 * @param {Object} filters - Current filter values
 */
function updateActiveFilterCount(filters) {
    const filterBar = document.querySelector('[data-testid="filter-bar"]');
    if (!filterBar) return;

    // Remove existing filter count indicator
    const existingIndicator = filterBar.querySelector('.filter-count-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Count active filters (excluding sorting)
    const activeFilters = Object.entries(filters)
        .filter(([key, value]) => key !== 'sorting' && value && value !== '')
        .length;

    if (activeFilters > 0) {
        // Add active filter count indicator
        const indicator = document.createElement('div');
        indicator.className = 'filter-count-indicator absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold';
        indicator.textContent = `${activeFilters} filter${activeFilters > 1 ? 's' : ''} active`;
        
        // Make filter bar relative positioned for the absolute indicator
        filterBar.classList.add('relative');
        filterBar.appendChild(indicator);
    } else {
        filterBar.classList.remove('relative');
    }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

// Export render functions
export default {
    renderHeaderCounters,
    renderKanbanColumns,
    renderTaskCard,
    renderSubtaskRows,
    renderAddSubtaskForm,
    renderTagOptions,
    showSpinner,
    hideSpinner,
    setButtonLoading,
    showError,
    hideError,
    showSuccess,
    updateFilterIndicators
};