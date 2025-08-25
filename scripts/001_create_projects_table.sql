-- Migration 001: Create projects table for multi-project support
-- TaskMasterWeb Database Schema
-- Created: 2025-08-25

CREATE TABLE IF NOT EXISTS projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(500) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_projects_slug (slug),
    INDEX idx_projects_active (active)
);

-- Insert default project (uncomment and modify as needed)
-- INSERT INTO projects (slug, name, path, description) VALUES 
-- ('default', 'TaskMaster Web', '/workspace', 'Default TaskMaster project');