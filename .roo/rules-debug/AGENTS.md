# Debug Mode - Non-Obvious Rules

- **Test reports location**: Debug Playwright issues in `web/test-reports/` NOT standard playwright-report
- **Development hub**: Use `http://localhost:9652/test-results.html` for comprehensive test analysis
- **Database logs**: MySQL container logs show connection issues - check `MYSQL_HOST_PORT` conflicts
- **Task file merging**: Check `parsing_errors` and `duplicate_task_ids` arrays in storage.info() response
- **Modal debugging**: Subtask modal issues traced to `flex items-center` CSS class detection
- **Large file monitoring**: Storage logs file sizes - look for "WARNING: Large file detected" messages
- **Project routing**: 404 errors on project slugs - verify database entry AND path accessibility