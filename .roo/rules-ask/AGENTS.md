# Ask Mode - Non-Obvious Documentation

- **"Atlas" vs "TaskMaster"**: Atlas is the web UI component, TaskMaster is the broader ecosystem
- **Multi-project architecture**: NOT a single-tenant app - manages multiple isolated TaskMaster projects
- **Docker path mapping**: `/workspace` is current project, `/projects` maps to `E:/projects/` host directory
- **Admin interface**: Project management at `localhost:9652/admin.html` NOT within main app
- **Test infrastructure**: Development hub serves comprehensive test analysis, not just results
- **Storage discovery**: Auto-detects both `.taskmaster/` and fallback `taskmaster/` directories
- **Tag-based organization**: Tasks grouped by tags with separate JSON structures per tag