export let tasks = [];
export let allTasks = [];

export async function loadTasks(getApiUrl) {
    try {
        const response = await fetch(getApiUrl('/tasks'));
        const data = await response.json();
        if (data.ok) {
            tasks = data.data;
            allTasks = data.data;
            window.allTasks = data.data; // Store for filtering
            
            // Check if any advanced filters are active
            const hasAdvancedFilters = document.querySelectorAll('input[type="checkbox"]:checked').length > 0 ||
                                     document.getElementById('searchTasks').value.trim() !== '' ||
                                     document.getElementById('filterTag').value.trim() !== '' ||
                                     document.getElementById('filterStatus').value !== '' ||
                                     document.getElementById('filterPriority').value !== '';
            
            if (hasAdvancedFilters) {
                applyFilters();
            } else {
                renderKanbanBoard(allTasks);
            }
        } else {
            console.error('Failed to load tasks:', data);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

export function applySorting(tasksArray) {
    const sortBy = document.getElementById('sortBy').value;
    const sortOrder = document.getElementById('sortOrder').value;
    
    const sortedTasks = [...tasksArray].sort((a, b) => {
        let aValue, bValue;
        
        switch(sortBy) {
            case 'id':
                aValue = a.id;
                bValue = b.id;
                break;
            case 'priority':
                // High = 3, Medium = 2, Low = 1 for proper sorting
                const priorityMap = { 'high': 3, 'medium': 2, 'low': 1 };
                aValue = priorityMap[a.priority] || 0;
                bValue = priorityMap[b.priority] || 0;
                break;
            case 'title':
                aValue = (a.title || '').toLowerCase();
                bValue = (b.title || '').toLowerCase();
                break;
            case 'status':
                const statusMap = { 'todo': 1, 'in-progress': 2, 'done': 3 };
                aValue = statusMap[a.status] || 0;
                bValue = statusMap[b.status] || 0;
                break;
            case 'due_date':
                aValue = new Date(a.due_date || '1900-01-01');
                bValue = new Date(b.due_date || '1900-01-01');
                break;
            case 'assigned_to':
                aValue = (a.assigned_to || '').toLowerCase();
                bValue = (b.assigned_to || '').toLowerCase();
                break;
            case 'created_at':
                aValue = new Date(a.created_at || '1900-01-01');
                bValue = new Date(b.created_at || '1900-01-01');
                break;
            default:
                return 0;
        }
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return sortedTasks;
}

export function renderKanbanBoard(tasksToRender) {
    // Apply sorting before grouping
    const sortedTasks = applySorting(tasksToRender);
    
    // Group tasks by status
    const todoTasks = sortedTasks.filter(task => task.status === 'todo');
    const inProgressTasks = sortedTasks.filter(task => task.status === 'in-progress');  
    const doneTasks = sortedTasks.filter(task => task.status === 'done');
    
    // Update counters
    document.getElementById('todoCount').textContent = todoTasks.length;
    document.getElementById('inProgressCount').textContent = inProgressTasks.length;
    document.getElementById('doneCount').textContent = doneTasks.length;
    
    // Render columns
    document.getElementById('todoColumn').innerHTML = todoTasks.length > 0 
        ? todoTasks.map(task => createTaskCard(task)).join('')
        : '<div class="text-center text-slate-400 py-8">No tasks</div>';
        
    document.getElementById('inProgressColumn').innerHTML = inProgressTasks.length > 0
        ? inProgressTasks.map(task => createTaskCard(task)).join('')
        : '<div class="text-center text-slate-400 py-8">No tasks</div>';
        
    document.getElementById('doneColumn').innerHTML = doneTasks.length > 0
        ? doneTasks.map(task => createTaskCard(task)).join('')
        : '<div class="text-center text-slate-400 py-8">No tasks</div>';
}

export function createTaskCard(task) {
    const priorityClass = {
        'high': 'border-l-4 border-l-red-500 bg-red-950/20',
        'medium': 'border-l-4 border-l-orange-500 bg-orange-950/20',
        'low': 'border-l-4 border-l-slate-500 bg-slate-900/50'
    }[task.priority] || 'border-l-4 border-l-slate-500 bg-slate-900/50';

    const priorityColor = {
        'high': 'text-red-400',
        'medium': 'text-orange-400',
        'low': 'text-slate-400'
    }[task.priority] || 'text-slate-400';

    return `
        <div class="task-card group relative p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors ${priorityClass}" 
             onclick="openEditModal(${task.id})">
            <div class="flex items-start justify-between mb-2">
                <span class="text-sm font-semibold text-slate-300">#${task.id}</span>
                <span class="text-xs ${priorityColor} capitalize font-medium">${task.priority}</span>
            </div>
            <h3 class="font-medium text-slate-100 mb-2 text-sm break-words overflow-wrap" style="word-wrap: break-word; overflow-wrap: break-word; white-space: normal; line-height: 1.4;">${task.title}</h3>
            ${task.description ? `<p class="text-xs text-slate-400 mb-2 overflow-hidden break-words max-w-full" style="word-wrap: break-word; overflow-wrap: break-word;">${task.description}</p>` : ''}
            ${task.assigned_to ? `<div class="text-xs text-slate-500">👤 ${task.assigned_to}</div>` : ''}
            ${task.due_date ? `<div class="text-xs text-slate-500 mt-1">📅 ${task.due_date}</div>` : ''}
            ${task.subtasks && task.subtasks.length > 0 ? 
                `<div class="mt-2 border-t border-slate-700 pt-2">
                    <div class="text-xs text-blue-400 mb-1">📂 Subtasks (${task.subtasks.length}):</div>
                    ${task.subtasks.sort((a, b) => {
                        const aNum = parseInt(a.id.toString().split('.').pop()) || 0;
                        const bNum = parseInt(b.id.toString().split('.').pop()) || 0;
                        return aNum - bNum;
                    }).map(subtask => `
                        <div class="text-xs text-slate-300 hover:text-blue-300 cursor-pointer pl-2 py-1 hover:bg-slate-700 rounded transition-colors" 
                             onclick="event.stopPropagation(); openEditSubtaskModal(${task.id}, ${subtask.id})">
                            <span class="text-slate-500">${subtask.id}.</span> ${subtask.title}
                            <span class="text-xs ${subtask.priority === 'high' ? 'text-red-400' : subtask.priority === 'medium' ? 'text-orange-400' : 'text-slate-500'}">(${subtask.priority})</span>
                        </div>
                    `).join('')}
                </div>` : ''}
            
            <!-- Delete Button -->
            <button class="absolute bottom-2 right-2 p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                    onclick="event.stopPropagation(); deleteTask(${task.id})"
                    title="Delete task">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </div>
    `;
}