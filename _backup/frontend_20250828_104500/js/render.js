// render.js - UI rendering functions for Atlas Task Management
// Handles DOM manipulation and template generation

import state from './state.js';

// Utility function to create DOM elements
function createElement(tag, className = '', attributes = {}) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    Object.entries(attributes).forEach(([key, value]) => {
        if (key.startsWith('data-')) {
            element.setAttribute(key, value);
        } else {
            element[key] = value;
        }
    });
    return element;
}

// Utility function to safely set text content
function setTextContent(element, text) {
    element.textContent = text || '';
}

// Update header with project name and working directory
export function updateHeader() {
    const projectNameElement = document.getElementById('project-name');
    const workingDirElement = document.getElementById('working-directory');
    
    if (projectNameElement) {
        setTextContent(projectNameElement, state.get('projectName'));
    }
    
    if (workingDirElement) {
        const workingDir = state.get('workingDirectory');
        setTextContent(workingDirElement, workingDir ? `Working directory: ${workingDir}` : '');
    }
}

// Update task counters in header
export function updateCounters() {
    const stats = state.getTaskStatistics();
    
    // Map internal status to counter element IDs
    const counterMapping = {
        'pending': 'count-backlog',
        'todo': 'count-todo', 
        'in-progress': 'count-inprogress',
        'review': 'count-review',
        'done': 'count-done',
        'deferred': 'count-deferred',
        'cancelled': 'count-cancelled'
    };
    
    Object.entries(counterMapping).forEach(([status, elementId]) => {
        const element = document.getElementById(elementId);
        if (element) {
            setTextContent(element, stats[status] || 0);
        }
    });
}

// Generate priority badge HTML
function getPriorityBadgeClass(priority) {
    switch (priority) {
        case 'high':
            return 'bg-red-100 text-red-800';
        case 'medium':
            return 'bg-orange-100 text-orange-800';
        case 'low':
            return 'bg-green-100 text-green-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Create task card element
export function createTaskCard(task) {
    const card = createElement('div', 'bg-white rounded-lg shadow-md p-4 mb-4 hover:shadow-lg transition-shadow cursor-pointer', {
        'data-testid': 'card',
        'data-task-id': task.id
    });
    
    // Task header with title and priority
    const header = createElement('div', 'flex justify-between items-start mb-2');
    
    const title = createElement('h3', 'text-lg font-semibold text-gray-900 flex-1');
    setTextContent(title, task.title || `Task ${task.id}`);
    
    const priorityBadge = createElement('span', `px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClass(task.priority)}`);
    setTextContent(priorityBadge, (task.priority || 'medium').toUpperCase());
    
    header.appendChild(title);
    header.appendChild(priorityBadge);
    
    // Task description
    if (task.description) {
        const description = createElement('p', 'text-gray-600 text-sm mb-3');
        setTextContent(description, task.description.length > 100 ? 
            task.description.substring(0, 100) + '...' : task.description);
        card.appendChild(description);
    }
    
    // Task metadata
    const metadata = createElement('div', 'flex justify-between items-center text-xs text-gray-500');
    
    const leftMeta = createElement('div', 'flex space-x-3');
    
    // Task ID
    const taskId = createElement('span');
    setTextContent(taskId, `#${task.id}`);
    leftMeta.appendChild(taskId);
    
    // Subtask count
    if (task.subtasks && task.subtasks.length > 0) {
        const subtaskCount = createElement('span');
        setTextContent(subtaskCount, `${task.subtasks.length} subtasks`);
        leftMeta.appendChild(subtaskCount);
    }
    
    // Due date
    if (task.due_date) {
        const dueDate = createElement('span');
        setTextContent(dueDate, `Due: ${task.due_date}`);
        leftMeta.appendChild(dueDate);
    }
    
    const rightMeta = createElement('div', 'flex space-x-2');
    
    // Labels/tags
    if (task.labels && task.labels.length > 0) {
        task.labels.slice(0, 2).forEach(label => {
            const tag = createElement('span', 'bg-blue-100 text-blue-800 px-2 py-1 rounded');
            setTextContent(tag, label);
            rightMeta.appendChild(tag);
        });
    }
    
    metadata.appendChild(leftMeta);
    metadata.appendChild(rightMeta);
    
    card.appendChild(header);
    card.appendChild(metadata);
    
    return card;
}

// Render Kanban columns
export function renderKanban() {
    const kanbanBoard = document.getElementById('kanban-board');
    if (!kanbanBoard) return;
    
    const tasks = state.get('tasks');
    const stats = state.getTaskStatistics();
    
    // Clear existing content
    kanbanBoard.innerHTML = '';
    
    // Define column order and mapping
    const columns = [
        { key: 'pending', title: 'Backlog', count: stats.pending },
        { key: 'todo', title: 'Todo', count: stats.todo },
        { key: 'in-progress', title: 'In progress', count: stats['in-progress'] },
        { key: 'review', title: 'Review', count: stats.review },
        { key: 'done', title: 'Done', count: stats.done },
        { key: 'deferred', title: 'Deferred', count: stats.deferred },
        { key: 'cancelled', title: 'Cancelled', count: stats.cancelled }
    ];
    
    columns.forEach(column => {
        const columnElement = createElement('div', 'flex flex-col', {
            'data-testid': `column-${column.key}`
        });
        
        // Column header
        const header = createElement('div', 'bg-gray-100 rounded-t-lg p-3 border-b');
        const headerContent = createElement('div', 'flex justify-between items-center');
        
        const title = createElement('h2', 'font-semibold text-gray-800');
        setTextContent(title, column.title);
        
        const count = createElement('span', 'bg-gray-500 text-white rounded-full px-2 py-1 text-xs');
        setTextContent(count, column.count);
        
        headerContent.appendChild(title);
        headerContent.appendChild(count);
        header.appendChild(headerContent);
        
        // Column body
        const body = createElement('div', 'bg-gray-50 rounded-b-lg p-3 min-h-32 flex-1');
        
        // Filter tasks for this column
        const columnTasks = tasks.filter(task => task.status === column.key);
        
        if (columnTasks.length > 0) {
            columnTasks.forEach(task => {
                const taskCard = createTaskCard(task);
                body.appendChild(taskCard);
            });
        } else {
            const emptyState = createElement('p', 'text-gray-500 text-center py-8');
            setTextContent(emptyState, 'No tasks');
            body.appendChild(emptyState);
        }
        
        columnElement.appendChild(header);
        columnElement.appendChild(body);
        kanbanBoard.appendChild(columnElement);
    });
}

// Update filter dropdowns
export function updateFilters() {
    const allTasks = state.get('allTasks');
    
    // Update tags dropdown
    const tagsFilter = document.getElementById('tags-filter');
    if (tagsFilter) {
        // Collect all unique tags
        const allTags = new Set();
        allTasks.forEach(task => {
            if (task.labels) {
                task.labels.forEach(label => allTags.add(label));
            }
        });
        
        // Clear existing options except "All Tags"
        while (tagsFilter.children.length > 1) {
            tagsFilter.removeChild(tagsFilter.lastChild);
        }
        
        // Add tag options
        Array.from(allTags).sort().forEach(tag => {
            const option = createElement('option');
            option.value = tag;
            setTextContent(option, tag);
            tagsFilter.appendChild(option);
        });
    }
}

// Show/hide spinner
export function showSpinner() {
    const spinner = document.querySelector('[data-testid="spinner"]');
    if (spinner) {
        spinner.classList.remove('hidden');
    }
}

export function hideSpinner() {
    const spinner = document.querySelector('[data-testid="spinner"]');
    if (spinner) {
        spinner.classList.add('hidden');
    }
}

// Show/hide error banner
export function showError(message) {
    const errorBanner = document.querySelector('[data-testid="error-banner"]');
    const errorMessage = document.getElementById('error-message');
    
    if (errorBanner && errorMessage) {
        setTextContent(errorMessage, message);
        errorBanner.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            hideError();
        }, 5000);
    }
}

export function hideError() {
    const errorBanner = document.querySelector('[data-testid="error-banner"]');
    if (errorBanner) {
        errorBanner.classList.add('hidden');
    }
}

// Render task modal
export function renderTaskModal() {
    const modal = document.querySelector('[data-testid="task-modal"]');
    if (!modal) return;
    
    const modalState = state.get('modals.taskModal');
    
    if (modalState.open) {
        modal.classList.remove('hidden');
        
        // Create modal content (basic structure for now)
        const modalContent = modal.querySelector('.bg-white') || createElement('div', 'bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto');
        modalContent.innerHTML = `
            <div class="p-6">
                <h2 class="text-2xl font-bold mb-4">${modalState.mode === 'create' ? 'Create New Task' : 'Edit Task'}</h2>
                <p class="text-gray-600">Modal content will be implemented in future tasks...</p>
                <div class="mt-6 flex justify-end space-x-3">
                    <button id="cancel-task-modal" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
                    <button id="save-task-modal" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
            </div>
        `;
        
        if (!modal.contains(modalContent)) {
            modal.appendChild(modalContent);
        }
    } else {
        modal.classList.add('hidden');
    }
}

// Complete UI refresh
export function renderAll() {
    updateHeader();
    updateCounters();
    renderKanban();
    updateFilters();
    renderTaskModal();
    
    // Handle loading and error states
    const loading = state.get('loading');
    const error = state.get('error');
    
    if (loading.main || loading.tasks) {
        showSpinner();
    } else {
        hideSpinner();
    }
    
    if (error.show) {
        showError(error.message);
    } else {
        hideError();
    }
}