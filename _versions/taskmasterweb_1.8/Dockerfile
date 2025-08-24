FROM python:3.11-slim
WORKDIR /srv/app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
ENV HOST=0.0.0.0
ENV PORT=8000
ENV PROJECT_NAME=
ENV TASKMASTER_DIR=/workspace/.taskmaster
ENV TASKS_FILE=
ENV STATE_FILE=
ENV CONFIG_FILE=
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
