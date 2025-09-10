import { allTasks, renderKanbanBoard } from './tasks.js';

export function applyFilters() {
    let filteredTasks = [...allTasks];
    
    // Legacy filters
    const statusFilter = document.getElementById('filterStatus').value;
    const priorityFilter = document.getElementById('filterPriority').value;
    const searchFilter = document.getElementById('filterTag').value.toLowerCase();
    
    // Advanced filters
    const selectedStatus = Array.from(document.querySelectorAll('input[name="statusFilter"]:checked')).map(cb => cb.value);
    const selectedPriority = Array.from(document.querySelectorAll('input[name="priorityFilter"]:checked')).map(cb => cb.value);
    const selectedAdditional = Array.from(document.querySelectorAll('input[name="additionalFilter"]:checked')).map(cb => cb.value);
    const advancedSearchText = document.getElementById('searchTasks').value.toLowerCase();
    
    // Apply legacy filters
    if (statusFilter) {
        filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
    }
    if (priorityFilter) {
        filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
    }
    if (searchFilter) {
        filteredTasks = filteredTasks.filter(task => {
            const searchableText = (task.title + ' ' + task.description + ' ' + (task.assigned_to || '')).toLowerCase();
            return searchableText.includes(searchFilter);
        });
    }
    
    // Apply advanced status filters
    if (selectedStatus.length > 0) {
        filteredTasks = filteredTasks.filter(task => selectedStatus.includes(task.status));
    }
    
    // Apply advanced priority filters
    if (selectedPriority.length > 0) {
        filteredTasks = filteredTasks.filter(task => selectedPriority.includes(task.priority));
    }
    
    // Apply additional filters
    if (selectedAdditional.length > 0) {
        filteredTasks = filteredTasks.filter(task => {
            return selectedAdditional.every(filter => {
                switch (filter) {
                    case 'hasSubtasks':
                        return task.subtasks && task.subtasks.length > 0;
                    case 'assigned':
                        return task.assigned_to && task.assigned_to.trim() !== '';
                    case 'overdue':
                        return task.due_date && new Date(task.due_date) < new Date();
                    default:
                        return true;
                }
            });
        });
    }
    
    // Apply advanced search
    if (advancedSearchText) {
        filteredTasks = filteredTasks.filter(task => {
            const searchableText = (task.title + ' ' + task.description + ' ' + (task.assigned_to || '')).toLowerCase();
            return searchableText.includes(advancedSearchText);
        });
    }
    
    // Update filter summary
    updateFilterSummary(filteredTasks.length, allTasks.length);
    
    renderKanbanBoard(filteredTasks);
}

export function updateFilterSummary(visibleCount, totalCount) {
    const summaryDiv = document.getElementById('filterSummary');
    const taskCountSpan = document.getElementById('filteredTaskCount');
    
    taskCountSpan.textContent = `${visibleCount}/${totalCount}`;
    
    // Show summary if filters are active
    const hasActiveFilters = 
        document.getElementById('filterStatus').value !== '' ||
        document.getElementById('filterPriority').value !== '' ||
        document.getElementById('filterTag').value.trim() !== '' ||
        document.getElementById('searchTasks').value.trim() !== '' ||
        document.querySelectorAll('input[type="checkbox"]:checked').length > 0;
        
    if (hasActiveFilters) {
        summaryDiv.classList.remove('hidden');
    } else {
        summaryDiv.classList.add('hidden');
    }
}

export function syncQuickSort() {
    const sortBy = document.getElementById('sortBy').value;
    const sortOrder = document.getElementById('sortOrder').value;
    const quickSort = document.getElementById('quickSort');
    
    if (sortBy === 'id' && sortOrder === 'asc') {
        quickSort.value = 'id-asc';
    } else if (sortBy === 'id' && sortOrder === 'desc') {
        quickSort.value = 'id-desc';
    } else if (sortBy === 'priority' && sortOrder === 'desc') {
        quickSort.value = 'priority-desc';
    } else {
        // Reset to default if no matching combination
        quickSort.value = 'id-asc';
    }
}