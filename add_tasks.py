import traceback
from app.storage import TaskStorage
from app.models import AddTaskRequest

storage = TaskStorage()

tasks_to_add = [
    {
        "title": "Correct HOST_PORT in .env.example",
        "description": "The HOST_PORT in .env.example should be changed to 8199 to match the default in docker-compose.yml. This will ensure that the application runs on the expected port by default.",
        "priority": "high",
        "status": "todo"
    },
    {
        "title": "Update CORS configuration",
        "description": "The CORS configuration should be updated to dynamically allow the HOST_PORT. This can be done by reading the HOST_PORT environment variable and dynamically adding it to the list of allowed origins.",
        "priority": "high",
        "status": "todo"
    },
    {
        "title": "Implement dynamic URL construction on the frontend",
        "description": "Implement a JavaScript-based solution on the frontend to construct API endpoints dynamically. This can be done by getting the project slug from the URL and using it as a base for all API calls.",
        "priority": "medium",
        "status": "todo"
    },
    {
        "title": "Improve handling of duplicate tasks and report parsing errors",
        "description": "Improve the handling of duplicate tasks and report parsing errors to the user. Instead of skipping duplicates, the application should flag them and present them to the user for resolution. The application should also report any JSON parsing errors to the user.",
        "priority": "medium",
        "status": "todo"
    }
]

try:
    for task in tasks_to_add:
        add_request = AddTaskRequest(
            title=task["title"],
            description=task["description"],
            priority=task["priority"],
            status=task["status"]
        )
        storage.add_task(add_request)

    print("Tasks added successfully!")
except Exception as e:
    print(f"An error occurred: {e}")
    traceback.print_exc()