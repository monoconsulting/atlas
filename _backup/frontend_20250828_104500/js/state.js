// state.js - In-memory state management for Atlas Task Management
// Provides centralized state with reactive updates and validation

class StateManager {
    constructor() {
        this.state = {
            // Project information
            projectInfo: null,
            projectName: 'Loading...',
            workingDirectory: 'Loading...',
            currentTag: 'master',
            availableTags: [],
            
            // Tasks data
            tasks: [],
            allTasks: [], // Unfiltered tasks for reference
            
            // UI state
            loading: {
                main: false,
                tasks: false,
                creating: false,
                updating: false
            },
            
            // Filter state
            filters: {
                status: '',
                priority: '',
                tags: '',
                search: '',
                sorting: 'id-asc'
            },
            
            // Modal state
            modals: {
                taskModal: {
                    open: false,
                    mode: 'create', // 'create' or 'edit'
                    taskData: null
                }
            },
            
            // Error state
            error: {
                show: false,
                message: ''
            }
        };
        
        this.listeners = new Set();
        this.validationRules = {
            tasks: (tasks) => Array.isArray(tasks),
            projectName: (name) => typeof name === 'string' && name.length > 0,
            currentTag: (tag) => typeof tag === 'string' && tag.length > 0
        };
    }
    
    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    
    // Notify all listeners of state change
    notifyListeners(changedPath = null) {
        this.listeners.forEach(listener => {
            try {
                listener(this.state, changedPath);
            } catch (error) {
                console.error('State listener error:', error);
            }
        });
    }
    
    // Get current state (read-only)
    getState() {
        return { ...this.state };
    }
    
    // Get specific state property
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }
    
    // Set state with validation and change notification
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.state);
        
        // Validate if validation rule exists
        const validationRule = this.validationRules[path] || this.validationRules[lastKey];
        if (validationRule && !validationRule(value)) {
            console.warn(`Invalid value for ${path}:`, value);
            return false;
        }
        
        const oldValue = target[lastKey];
        target[lastKey] = value;
        
        // Notify listeners if value actually changed
        if (oldValue !== value) {
            this.notifyListeners(path);
        }
        
        return true;
    }
    
    // Update nested state
    update(path, updater) {
        const currentValue = this.get(path);
        const newValue = typeof updater === 'function' ? updater(currentValue) : updater;
        return this.set(path, newValue);
    }
    
    // Project info methods
    setProjectInfo(info) {
        this.set('projectInfo', info);
        if (info?.data) {
            this.set('projectName', info.data.project_name || 'TaskMaster');
            this.set('workingDirectory', info.data.base_dir || '');
            this.set('currentTag', info.data.current_tag || 'master');
            this.set('availableTags', info.data.available_tags || []);
        }
    }
    
    // Tasks methods
    setTasks(tasks) {
        const taskList = Array.isArray(tasks) ? tasks : (tasks?.data || []);
        this.set('tasks', taskList);
        this.set('allTasks', [...taskList]);
        this.applyFilters();
    }
    
    addTask(task) {
        const currentTasks = this.get('allTasks');
        const newTasks = [...currentTasks, task];
        this.set('allTasks', newTasks);
        this.applyFilters();
    }
    
    updateTask(taskId, updates) {
        const allTasks = this.get('allTasks');
        const updatedTasks = allTasks.map(task => 
            task.id === taskId ? { ...task, ...updates } : task
        );
        this.set('allTasks', updatedTasks);
        this.applyFilters();
    }
    
    removeTask(taskId) {
        const allTasks = this.get('allTasks');
        const filteredTasks = allTasks.filter(task => task.id !== taskId);
        this.set('allTasks', filteredTasks);
        this.applyFilters();
    }
    
    // Filter methods
    setFilter(filterType, value) {
        this.set(`filters.${filterType}`, value);
        this.applyFilters();
    }
    
    clearFilters() {
        this.set('filters', {
            status: '',
            priority: '',
            tags: '',
            search: '',
            sorting: 'id-asc'
        });
        this.applyFilters();
    }
    
    applyFilters() {
        const allTasks = this.get('allTasks');
        const filters = this.get('filters');
        
        let filteredTasks = [...allTasks];
        
        // Status filter
        if (filters.status) {
            filteredTasks = filteredTasks.filter(task => task.status === filters.status);
        }
        
        // Priority filter
        if (filters.priority) {
            filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
        }
        
        // Tags filter
        if (filters.tags) {
            filteredTasks = filteredTasks.filter(task => 
                task.labels && task.labels.includes(filters.tags)
            );
        }
        
        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredTasks = filteredTasks.filter(task => 
                task.title?.toLowerCase().includes(searchTerm) ||
                task.description?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply sorting
        filteredTasks.sort((a, b) => {
            switch (filters.sorting) {
                case 'id-desc':
                    return b.id - a.id;
                case 'priority-desc':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                case 'priority-asc':
                    const priorityOrderAsc = { high: 3, medium: 2, low: 1 };
                    return (priorityOrderAsc[a.priority] || 0) - (priorityOrderAsc[b.priority] || 0);
                case 'id-asc':
                default:
                    return a.id - b.id;
            }
        });
        
        this.set('tasks', filteredTasks);
    }
    
    // Loading state methods
    setLoading(type, isLoading) {
        this.set(`loading.${type}`, isLoading);
    }
    
    // Modal methods
    openTaskModal(mode = 'create', taskData = null) {
        this.set('modals.taskModal', {
            open: true,
            mode,
            taskData: taskData ? { ...taskData } : null
        });
    }
    
    closeTaskModal() {
        this.set('modals.taskModal', {
            open: false,
            mode: 'create',
            taskData: null
        });
    }
    
    // Error methods
    showError(message) {
        this.set('error', {
            show: true,
            message
        });
    }
    
    clearError() {
        this.set('error', {
            show: false,
            message: ''
        });
    }
    
    // Statistics methods
    getTaskStatistics() {
        const allTasks = this.get('allTasks');
        const stats = {
            total: allTasks.length,
            pending: 0,
            todo: 0,
            'in-progress': 0,
            review: 0,
            done: 0,
            deferred: 0,
            cancelled: 0
        };
        
        allTasks.forEach(task => {
            if (stats.hasOwnProperty(task.status)) {
                stats[task.status]++;
            }
        });
        
        return stats;
    }
    
    // Status mapping for UI display
    getStatusDisplayName(status) {
        const statusMap = {
            'pending': 'Backlog',
            'todo': 'Todo',
            'in-progress': 'In progress',
            'review': 'Review',
            'done': 'Done',
            'deferred': 'Deferred',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
    }
}

// Create and export singleton instance
const state = new StateManager();

export default state;
export { StateManager };