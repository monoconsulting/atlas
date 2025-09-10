import { loadTasks, allTasks } from './tasks.js';
import { getApiUrl } from './utils.js';

// Task creation
export async function createTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const assignedTo = document.getElementById('taskAssignedTo').value.trim();

    if (!title) {
        console.error('Task title is required');
        return;
    }

    const taskData = {
        title: title,
        description: description || '-',
        priority: priority,
        status: 'todo',
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
        dependencies: []
    };

    try {
        const response = await fetch(getApiUrl('/task'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });

        const result = await response.json();
        if (result.ok) {
            console.log('Task created successfully:', result.data);
            const createdTaskId = result.data.id;
            
            // Create subtasks if any were added
            if (window.createSubtasks.length > 0) {
                for (const subtask of window.createSubtasks) {
                    if (subtask.title.trim()) {
                        try {
                            await createSubtaskFromData(createdTaskId, subtask);
                        } catch (error) {
                            console.error('Failed to create subtask:', subtask, error);
                        }
                    }
                }
            }
            
            // Clear form and close modal
            document.getElementById('addTaskForm').reset();
            clearCreateSubtasks();
            document.getElementById('createTaskModal').classList.add('hidden');
            document.body.style.overflow = ''; // Re-enable body scrolling
            // Reload tasks
            await loadTasks();
        } else {
            console.error('Failed to create task:', result);
        }
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

// Task deletion function
export async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(getApiUrl(`/task/${taskId}`), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deleted: true })
        });
        
        if (response.ok) {
            console.log('Task soft deleted successfully');
            await loadTasks(); // Refresh the task list
        } else {
            const errorResult = await response.json();
            console.error('Failed to delete task:', errorResult.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

// Modal functions
export async function openEditModal(taskId) {
    console.log('Opening edit modal for task:', taskId);
    
    // Find the task data
    console.log('Looking for task ID:', taskId, 'in allTasks:', allTasks.map(t => t.id));
    const task = allTasks.find(t => t.id === taskId);
    if (!task) {
        console.error('Task not found, taskId:', taskId, 'allTasks IDs:', allTasks.map(t => t.id));
        return;
    }
    
    // Populate modal fields
    document.getElementById('editTaskTitle').value = task.title || '';
    document.getElementById('editTaskDescription').value = task.description || '';
    document.getElementById('editTaskPriority').value = task.priority || 'medium';
    document.getElementById('editTaskStatus').value = task.status || 'todo';
    document.getElementById('editTaskDueDate').value = task.due_date || '';
    document.getElementById('editTaskAssignedTo').value = task.assigned_to || '';
    
    // Populate subtasks
    try {
        populateSubtasks(task);
        console.log('Subtasks populated successfully');
    } catch (error) {
        console.error('Error populating subtasks:', error);
    }
    
    // Store task ID for saving
    document.getElementById('editModal').dataset.taskId = taskId;
    
    console.log('About to show modal, current class:', document.getElementById('editModal').className);
    document.getElementById('editModal').classList.remove('hidden');
    document.body.style.overflow = ''; // Prevent body scrolling
    console.log('Modal class after remove hidden:', document.getElementById('editModal').className);
}

export async function saveTask() {
    const taskId = parseInt(document.getElementById('editModal').dataset.taskId);
    
    // Collect all new subtasks from the edit form
    const newSubtasks = [];
    const subtasksList = document.getElementById('subtasksList');
    const newSubtaskDivs = subtasksList.querySelectorAll('.bg-slate-900.border.border-slate-800');
    
    newSubtaskDivs.forEach(div => {
        const titleInput = div.querySelector('[data-field="title"]');
        const descriptionInput = div.querySelector('[data-field="description"]');
        const prioritySelect = div.querySelector('[data-field="priority"]');
        
        if (titleInput && titleInput.value.trim()) {
            newSubtasks.push({
                title: titleInput.value.trim(),
                description: descriptionInput ? descriptionInput.value.trim() : '',
                priority: prioritySelect ? prioritySelect.value : 'medium',
                status: 'todo'
            });
        }
    });
    
    const taskData = {
        title: document.getElementById('editTaskTitle').value.trim(),
        description: document.getElementById('editTaskDescription').value.trim(),
        priority: document.getElementById('editTaskPriority').value,
        status: document.getElementById('editTaskStatus').value,
        due_date: document.getElementById('editTaskDueDate').value || null,
        assigned_to: document.getElementById('editTaskAssignedTo').value.trim() || null
    };
    
    if (!taskData.title) {
        console.error('Task title is required');
        return;
    }
    
    try {
        const response = await fetch(getApiUrl(`/task/${taskId}`), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Task updated successfully:', result);
            
            // Now create any new subtasks
            for (const subtask of newSubtasks) {
                await createSubtaskFromData(taskId, subtask);
            }
            
            document.getElementById('editModal').classList.add('hidden');
            document.body.style.overflow = ''; // Re-enable body scrolling
            await loadTasks(); // Refresh the task list
        } else {
            const errorResult = await response.json();
            console.error('Failed to update task:', errorResult.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

// Subtask management functions
export function populateSubtasks(task) {
    const subtasksList = document.getElementById('subtasksList');
    if (!subtasksList) return;
    
    if (!task.subtasks || task.subtasks.length === 0) {
        subtasksList.innerHTML = '<p class="text-sm text-slate-500 italic">No subtasks yet</p>';
        return;
    }
    
    // Sort subtasks by ID
    const sortedSubtasks = [...task.subtasks].sort((a, b) => {
        // Handle both numeric IDs (1, 2) and string IDs ("1.1", "1.2")
        const aId = typeof a.id === 'number' ? a.id : parseInt(a.id.toString().split('.').pop() || '0');
        const bId = typeof b.id === 'number' ? b.id : parseInt(b.id.toString().split('.').pop() || '0');
        return aId - bId;
    });
    
    subtasksList.innerHTML = sortedSubtasks.map(subtask => `
        <div class="bg-slate-900 border border-slate-700 rounded p-3" data-subtask-id="${subtask.id}">
            <div class="flex items-start justify-between mb-2">
                <span class="text-xs text-slate-400 font-mono">#${subtask.id}</span>
                <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-1 rounded ${
                        subtask.priority === 'high' ? 'bg-red-900 text-red-300' : 
                        subtask.priority === 'medium' ? 'bg-orange-900 text-orange-300' : 
                        'bg-slate-800 text-slate-400'
                    }">${subtask.priority}</span>
                    <select class="text-xs px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 subtask-status-select" 
                            data-task-id="${task.id}" data-subtask-id="${subtask.id}">
                        <option value="todo" ${subtask.status === 'todo' ? 'selected' : ''}>Todo</option>
                        <option value="in-progress" ${subtask.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="done" ${subtask.status === 'done' ? 'selected' : ''}>Done</option>
                    </select>
                </div>
            </div>
            <input type="text" value="${subtask.title}" 
                   class="w-full mb-2 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm subtask-title-input"
                   data-task-id="${task.id}" data-subtask-id="${subtask.id}">
            ${subtask.description !== null && subtask.description !== undefined ? 
                `<textarea class="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-xs subtask-desc-input"
                   rows="2" data-task-id="${task.id}" data-subtask-id="${subtask.id}">${subtask.description || ''}</textarea>` : 
                `<textarea class="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200 text-xs subtask-desc-input"
                   rows="2" placeholder="Add description (optional)" data-task-id="${task.id}" data-subtask-id="${subtask.id}"></textarea>`}
        </div>
    `).join('');
    
    // Add event listeners after rendering
    subtasksList.querySelectorAll('.subtask-status-select').forEach(select => {
        select.addEventListener('change', function() {
            updateSubtaskStatus(this.dataset.taskId, this.dataset.subtaskId, this.value);
        });
    });
    
    subtasksList.querySelectorAll('.subtask-title-input').forEach(input => {
        input.addEventListener('change', function() {
            updateSubtaskTitle(this.dataset.taskId, this.dataset.subtaskId, this.value);
        });
    });
    
    subtasksList.querySelectorAll('.subtask-desc-input').forEach(textarea => {
        textarea.addEventListener('change', function() {
            updateSubtaskDescription(this.dataset.taskId, this.dataset.subtaskId, this.value);
        });
    });
}

// Placeholder functions for subtask updates (can be implemented later)
export async function updateSubtaskStatus(taskId, subtaskId, newStatus) {
    console.log('Update subtask status:', subtaskId, newStatus);
    try {
        const response = await fetch(getApiUrl(`/task/${taskId}/subtask/${subtaskId}`), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            await loadTasks(); // Refresh the task list
        } else {
            console.error('Failed to update subtask status');
        }
    } catch (error) {
        console.error('Error updating subtask status:', error);
    }
}

export async function updateSubtaskTitle(taskId, subtaskId, newTitle) {
    console.log('Update subtask title:', subtaskId, newTitle);
    try {
        const response = await fetch(getApiUrl(`/task/${taskId}/subtask/${subtaskId}`), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: newTitle })
        });
        
        if (response.ok) {
            await loadTasks(); // Refresh the task list
        } else {
            console.error('Failed to update subtask title');
        }
    } catch (error) {
        console.error('Error updating subtask title:', error);
    }
}

export async function updateSubtaskDescription(taskId, subtaskId, newDescription) {
    console.log('Update subtask description:', subtaskId, newDescription);
    try {
        const response = await fetch(getApiUrl(`/task/${taskId}/subtask/${subtaskId}`), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ description: newDescription })
        });
        
        if (response.ok) {
            await loadTasks(); // Refresh the task list
        } else {
            console.error('Failed to update subtask description');
        }
    } catch (error) {
        console.error('Error updating subtask description:', error);
    }
}

// Create modal subtask management
export let createSubtasks = [];
export let createSubtaskCounter = 1;

export function addSubtaskToEditForm() {
    const subtasksList = document.getElementById('subtasksList');
    const currentTaskId = document.getElementById('editModal').dataset.taskId;
    
    const subtaskDiv = document.createElement('div');
    subtaskDiv.className = 'bg-slate-900 border border-slate-800 rounded p-4 space-y-3';
    subtaskDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-slate-300">New Subtask</h4>
            <button type="button" class="text-slate-500 hover:text-red-400 transition-colors" onclick="this.parentElement.parentElement.remove()">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        <div>
            <input 
                type="text" 
                placeholder="Subtask title" 
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                data-field="title"
            >
        </div>
        <div>
            <textarea 
                placeholder="Subtask description (optional)" 
                rows="2"
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                data-field="description"
            ></textarea>
        </div>
        <div class="flex justify-between items-center">
            <select class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-100 text-xs" data-field="priority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
            </select>
        </div>
    `;
    
    subtasksList.appendChild(subtaskDiv);
    
}

export async function createSubtaskFromForm(taskId, subtaskDiv) {
    const titleInput = subtaskDiv.querySelector('[data-field="title"]');
    const descriptionInput = subtaskDiv.querySelector('[data-field="description"]');
    const prioritySelect = subtaskDiv.querySelector('[data-field="priority"]');
    
    const title = titleInput.value.trim();
    if (!title) {
        console.error('Subtask title is required');
        return;
    }
    
    const subtaskData = {
        title: title,
        description: descriptionInput.value.trim(),
        priority: prioritySelect.value,
        status: 'todo'
    };
    
    try {
        const response = await fetch(getApiUrl(`/task/${taskId}/subtask`), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subtaskData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Subtask created successfully:', result);
            subtaskDiv.remove();
            
            // Refresh the task data and update the edit modal
            const taskResponse = await fetch(getApiUrl(`/task/${taskId}`));
            if (taskResponse.ok) {
                const updatedTask = await taskResponse.json();
                populateSubtasks(updatedTask);
                
                // Also refresh the main tasks list
                loadTasks();
            }
        } else {
            const errorResult = await response.json();
            console.error('Failed to create subtask:', errorResult.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Error creating subtask:', error);
    }
}

export function addSubtaskToCreateForm() {
    const subtaskId = createSubtaskCounter++;
    const subtask = {
        id: subtaskId,
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo'
    };
    createSubtasks.push(subtask);
    
    renderCreateSubtasks();
}

export function removeCreateSubtask(subtaskId) {
    createSubtasks = createSubtasks.filter(s => s.id !== subtaskId);
    renderCreateSubtasks();
}

export function renderCreateSubtasks() {
    const container = document.getElementById('createSubtasksList');
    if (!container) return;
    
    // Update button text based on subtasks
    const submitBtn = document.getElementById('createTaskSubmitBtn');
    if (submitBtn) {
        submitBtn.textContent = createSubtasks.length > 0 ? 'Save Task' : 'Create Task';
    }
    
    if (createSubtasks.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 italic">No subtasks added yet</p>';
        return;
    }
    
    container.innerHTML = createSubtasks.map(subtask => `
        <div class="bg-slate-900 border border-slate-700 rounded p-3 mb-2" data-create-subtask-id="${subtask.id}">
            <div class="flex items-center justify-between">
                <span class="text-xs text-slate-400 font-mono">Subtask #${subtask.id}</span>
                <div class="flex items-center gap-2">
                    <select class="text-xs px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-200" 
                            onchange="updateCreateSubtask(${subtask.id}, 'priority', this.value)">
                        <option value="low" ${subtask.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${subtask.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${subtask.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                    <button type="button" class="text-red-400 hover:text-red-300 text-sm" onclick="removeCreateSubtask(${subtask.id})">
                        ✕
                    </button>
                </div>
            </div>
            <input type="text" placeholder="Subtask title" value="${subtask.title}" 
                   class="w-full mb-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                   oninput="updateCreateSubtask(${subtask.id}, 'title', this.value)">
            <textarea placeholder="Subtask description (optional)" rows="2" 
                      class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-200 text-xs resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
                      oninput="updateCreateSubtask(${subtask.id}, 'description', this.value)">${subtask.description}</textarea>
        </div>
    `).join('');
}

export function updateCreateSubtask(subtaskId, field, value) {
    const subtask = createSubtasks.find(s => s.id === subtaskId);
    if (subtask) {
        subtask[field] = value;
    }
}

export function clearCreateSubtasks() {
    createSubtasks = [];
    createSubtaskCounter = 1;
    renderCreateSubtasks();
}

export async function createSubtaskFromData(parentTaskId, subtaskData) {
    const subtaskPayload = {
        parent_id: parentTaskId,
        title: subtaskData.title,
        description: subtaskData.description || '',
        priority: subtaskData.priority,
        status: subtaskData.status
    };
    
    const response = await fetch(getApiUrl(`/task/${parentTaskId}/subtask`), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(subtaskPayload)
    });
    
    const result = await response.json();
    if (!result.ok) {
        throw new Error(result.message || 'Failed to create subtask');
    }
    
    return result.data;
}

// Subtask editing function
export async function openEditSubtaskModal(taskId, subtaskId) {
    console.log('Opening subtask edit:', taskId, subtaskId);
    
    // Find the task and subtask
    const task = allTasks.find(t => t.id === taskId);
    if (!task) {
        console.error('Task not found');
        return;
    }
    
    const subtask = task.subtasks.find(s => s.id == subtaskId); // Use == to handle string/number comparison
    if (!subtask) {
        console.error('Subtask not found:', subtaskId, 'Available subtasks:', task.subtasks.map(s => s.id));
        return;
    }
    
    // For now, open the main task edit modal and scroll to subtasks section
    // Later we can create a dedicated subtask modal
    await openEditModal(taskId);
    
    // Highlight the specific subtask if there's a subtask display in the modal
    console.log('Editing subtask:', subtask);
}