// main.js - Application bootstrap and event handling for Atlas Task Management
// Coordinates between api, state, and render modules

import * as api from './api.js';
import state from './state.js';
import { renderAll, showError, hideError } from './render.js';

class AtlasApp {
    constructor() {
        this.initialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Bind methods to preserve 'this' context
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleFilterChange = this.handleFilterChange.bind(this);
        this.handleTaskCardClick = this.handleTaskCardClick.bind(this);
        this.handleCreateTaskClick = this.handleCreateTaskClick.bind(this);
        this.handleModalClose = this.handleModalClose.bind(this);
        this.handleErrorBannerClick = this.handleErrorBannerClick.bind(this);
    }
    
    // Initialize the application
    async init() {
        console.log('Initializing Atlas Task Management...');
        
        try {
            // Subscribe to state changes
            state.subscribe(this.handleStateChange);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Initial render
            renderAll();
            
            this.initialized = true;
            console.log('Atlas initialization complete');
            
        } catch (error) {
            console.error('Failed to initialize Atlas:', error);
            this.handleError(error);
            
            // Retry initialization
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying initialization (${this.retryCount}/${this.maxRetries})...`);
                setTimeout(() => this.init(), 2000);
            }
        }
    }
    
    // Load initial application data
    async loadInitialData() {
        state.setLoading('main', true);
        
        try {
            // Fetch project info
            console.log('Fetching project info...');
            const info = await api.fetchInfo();
            state.setProjectInfo(info);
            
            // Fetch tasks for current tag
            console.log('Fetching tasks...');
            state.setLoading('tasks', true);
            const tasks = await api.fetchTasks(state.get('currentTag'));
            state.setTasks(tasks);
            
            console.log(`Loaded ${state.get('tasks').length} tasks`);
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            throw error;
        } finally {
            state.setLoading('main', false);
            state.setLoading('tasks', false);
        }
    }
    
    // Set up all event listeners
    setupEventListeners() {
        // Filter controls
        this.setupFilterListeners();
        
        // Action buttons
        this.setupActionButtons();
        
        // Modal handling
        this.setupModalListeners();
        
        // Error banner
        this.setupErrorListeners();
        
        // Task card interactions (delegated)
        this.setupTaskInteractions();
    }
    
    // Set up filter event listeners
    setupFilterListeners() {
        const filterElements = [
            'status-filter',
            'priority-filter', 
            'tags-filter',
            'sort-filter',
            'search-filter'
        ];
        
        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const event = element.tagName === 'INPUT' ? 'input' : 'change';
                element.addEventListener(event, this.handleFilterChange);
            }
        });
    }
    
    // Set up action button listeners
    setupActionButtons() {
        const createTaskBtn = document.getElementById('create-new-task-btn');
        if (createTaskBtn) {
            createTaskBtn.addEventListener('click', this.handleCreateTaskClick);
        }
        
        const createStatusBtn = document.getElementById('create-new-status-btn');
        if (createStatusBtn) {
            createStatusBtn.addEventListener('click', () => {
                console.log('Create new status - not implemented yet');
            });
        }
        
        const createTagBtn = document.getElementById('create-new-tag-btn');
        if (createTagBtn) {
            createTagBtn.addEventListener('click', () => {
                console.log('Create new tag - not implemented yet');
            });
        }
    }
    
    // Set up modal event listeners
    setupModalListeners() {
        const modal = document.querySelector('[data-testid="task-modal"]');
        if (modal) {
            // Close modal on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.handleModalClose();
                }
            });
        }
        
        // Modal will have dynamic buttons, so we'll use event delegation
        document.addEventListener('click', (e) => {
            if (e.target.id === 'cancel-task-modal') {
                this.handleModalClose();
            } else if (e.target.id === 'save-task-modal') {
                this.handleTaskSave();
            }
        });
    }
    
    // Set up error banner listeners
    setupErrorListeners() {
        const errorBanner = document.querySelector('[data-testid="error-banner"]');
        if (errorBanner) {
            errorBanner.addEventListener('click', this.handleErrorBannerClick);
        }
    }
    
    // Set up task card interactions using event delegation
    setupTaskInteractions() {
        const kanbanBoard = document.getElementById('kanban-board');
        if (kanbanBoard) {
            kanbanBoard.addEventListener('click', this.handleTaskCardClick);
        }
    }
    
    // Handle state changes
    handleStateChange(newState, changedPath) {
        // Only re-render if we're initialized and it's a significant change
        if (!this.initialized) return;
        
        const significantPaths = [
            'tasks',
            'projectInfo',
            'projectName',
            'loading',
            'error',
            'modals'
        ];
        
        const shouldRender = !changedPath || significantPaths.some(path => 
            changedPath.startsWith(path)
        );
        
        if (shouldRender) {
            renderAll();
        }
    }
    
    // Handle filter changes
    handleFilterChange(event) {
        const element = event.target;
        const filterType = element.id.replace('-filter', '');
        const value = element.value;
        
        console.log(`Filter changed: ${filterType} = ${value}`);
        state.setFilter(filterType === 'sort' ? 'sorting' : filterType, value);
    }
    
    // Handle task card clicks
    handleTaskCardClick(event) {
        const taskCard = event.target.closest('[data-task-id]');
        if (taskCard) {
            const taskId = parseInt(taskCard.dataset.taskId);
            const task = state.get('allTasks').find(t => t.id === taskId);
            
            if (task) {
                console.log(`Opening task ${taskId} for editing`);
                state.openTaskModal('edit', task);
            }
        }
    }
    
    // Handle create task button click
    handleCreateTaskClick() {
        console.log('Opening create task modal');
        state.openTaskModal('create');
    }
    
    // Handle modal close
    handleModalClose() {
        console.log('Closing task modal');
        state.closeTaskModal();
    }
    
    // Handle task save (placeholder)
    async handleTaskSave() {
        console.log('Task save - not fully implemented yet');
        // This will be implemented in future tasks
        state.closeTaskModal();
    }
    
    // Handle error banner click
    handleErrorBannerClick() {
        state.clearError();
    }
    
    // Handle errors
    handleError(error) {
        console.error('Application error:', error);
        
        let errorMessage = 'An unexpected error occurred';
        
        if (error.name === 'APIError') {
            errorMessage = `API Error: ${error.message}`;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        state.showError(errorMessage);
    }
    
    // Refresh data
    async refresh() {
        if (!this.initialized) return;
        
        try {
            console.log('Refreshing data...');
            await this.loadInitialData();
        } catch (error) {
            this.handleError(error);
        }
    }
    
    // Public methods for external access
    getState() {
        return state.getState();
    }
    
    getStats() {
        return state.getTaskStatistics();
    }
}

// Create application instance
const app = new AtlasApp();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    // DOM is already loaded
    app.init();
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    app.handleError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    app.handleError(event.reason);
});

// Export app instance for debugging
window.AtlasApp = app;

export default app;