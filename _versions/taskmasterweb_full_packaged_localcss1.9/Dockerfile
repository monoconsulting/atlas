
FROM python:3.11-slim

WORKDIR /srv/app

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Build Tailwind CSS locally (no CDN at runtime)
RUN curl -fsSL https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-linux-x64 -o /usr/local/bin/tailwindcss \
 && chmod +x /usr/local/bin/tailwindcss \
 && tailwindcss -c /srv/app/tailwind.config.js -i /srv/app/app/static/tw.css -o /srv/app/app/static/tailwind.css --minify

ENV HOST=0.0.0.0
ENV PORT=8000
ENV PROJECT_NAME=
ENV TASKMASTER_DIR=/workspace/.taskmaster
ENV TASKS_FILE=
ENV STATE_FILE=
ENV CONFIG_FILE=

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
