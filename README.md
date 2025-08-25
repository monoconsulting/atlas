
# taskmasterweb (local Tailwind build)

Tailwind kompileras **vid build** och servas från `/static/tailwind.css` (ingen CDN behövs).

## Start
1) Kopiera `.env.example` → `.env` och sätt `PROJECT_ROOT` och ev. `HOST_PORT` / `PROJECT_NAME`.
2) `docker compose up -d --build`
3) Öppna `http://localhost:8099`

## Changelog

### 2025-08-25 - Subtask Functionality Fixes
- **Fixed**: Subtasks now save properly with main "Save Changes" button in edit modal
- **Removed**: Confusing green "Save Subtask" buttons that were misleading users
- **Improved**: Modal UX with backdrop click to close and proper scroll behavior
- **Added**: Comprehensive test coverage for subtask persistence and modal interactions
- **Fixed**: Windows MCP configuration compatibility with `cmd /c` wrapper
- **Verified**: End-to-end data persistence in tasks.json with full test automation
