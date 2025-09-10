# Code Mode - Non-Obvious Rules

- **Subtask system is LOCKED**: DO NOT modify event handlers, backdrop detection, or form HTML structure
- **JSON writes use atomic pattern**: Always `tmp = path.with_suffix(".tmp")` then `tmp.replace(path)`
- **TaskStorage constructor behavior**: `base_dir` param bypasses ALL environment variables
- **API URL construction**: Use `getApiUrl()` from utils.js - handles project slug routing automatically
- **Modal backdrop prevention**: Subtask elements need `e.stopPropagation()` AND `e.preventDefault()`
- **Large file detection**: Check `_is_large_file()` before JSON operations - uses ijson for >100KB
- **Project isolation**: Never use global storage - each project slug creates isolated TaskStorage instance