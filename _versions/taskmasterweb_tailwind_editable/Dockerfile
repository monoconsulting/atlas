# taskmasterweb Dockerfile
FROM python:3.12-slim

# Install system deps and Python requirements
RUN apt-get update && apt-get install -y --no-install-recommends             curl ca-certificates build-essential             && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy minimal requirements inline to avoid extra files
RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic

# Copy application code
COPY app /app/app

# Environment for mounted project root inside container:
# You should mount your project directory to /workspace via docker-compose.
ENV TASKMASTER_DIR=/workspace/.taskmaster             TASKS_FILE=/workspace/.taskmaster/tasks/tasks.json             STATE_FILE=/workspace/.taskmaster/state.json             CONFIG_FILE=/workspace/.taskmaster/config.json

EXPOSE 8000

# Run the app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
