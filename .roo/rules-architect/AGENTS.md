# Architect Mode - Non-Obvious Constraints

- **Multi-container dependency**: WebServer depends on TaskMasterWeb service - affects startup order
- **Database isolation**: Each project has separate .taskmaster directory BUT shares MySQL container
- **Task ID scoping**: IDs are unique within tag scope only, NOT globally unique across tags
- **File merge strategy**: Multiple task files merged at runtime with conflict detection, NOT at build time
- **Modal state management**: Background scroll prevention requires manual body style manipulation
- **Project slug routing**: FastAPI serves same HTML with dynamic content replacement per project
- **Storage abstraction**: TaskStorage class handles both single-project and multi-project configurations transparently